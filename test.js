// ==UserScript==
// @name         IDR Post DOM Crawler
// @namespace    idr-post-dom-crawler
// @version      1.0.0
// @description  Crawl IDR posts through real DOM navigation and export JSON
// @match        https://hindi.idronline.org/*
// @grant        GM_download
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Navigation / state approach
   * ---------------------------
   * Clicking an article link navigates away from the listing page, so in-memory
   * variables are lost. Progress is stored in sessionStorage under
   * "idrCrawlerState" (pageNumber, articleIndex, results, visitedArticles,
   * visitedPages, running, completed, etc.).
   *
   * On every page load (document-idle), the script:
   * 1. Loads state
   * 2. Detects listing (.entry-content + .idr-post-item) vs article
   *    (.idr-single-hero-left)
   * 3. Continues from the saved articleIndex / pageNumber
   *
   * Flow: listing → click .idr-post-item-link → article inspect → history.back()
   * → listing → next article → … → click pagination → next page (max 5) → download JSON.
   */

  const STATE_KEY = "idrCrawlerState";
  const MAX_PAGES = 5;
  const POLL_MS = 200;
  const WAIT_TIMEOUT_MS = 30000;

  const DEFAULT_STATE = {
    running: true,
    completed: false,
    pageNumber: 1,
    articleIndex: 0,
    pagesProcessed: 0,
    listingUrl: "",
    results: [],
    errors: [],
    visitedArticles: [],
    visitedPages: [],
    phase: "listing", // listing | article | paginating | done
  };

  function log(...args) {
    console.log(...args);
  }

  function banner(title) {
    log("====================================");
    log(title);
    log("====================================");
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (e) {
      console.warn("[IDR Crawler] Failed to parse state, resetting.", e);
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(state) {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function updateState(patch) {
    const state = loadState();
    Object.assign(state, patch);
    saveState(state);
    return state;
  }

  function waitFor(predicate, timeoutMs = WAIT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        try {
          if (predicate()) {
            resolve(true);
            return;
          }
        } catch (_) {
          /* ignore transient DOM errors */
        }

        if (Date.now() - start >= timeoutMs) {
          reject(new Error("waitFor timeout"));
          return;
        }

        setTimeout(check, POLL_MS);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", check, { once: true });
      } else {
        check();
      }

      const observer = new MutationObserver(() => {
        try {
          if (predicate()) {
            observer.disconnect();
            resolve(true);
          }
        } catch (_) {
          /* ignore */
        }
      });

      if (document.documentElement) {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }

      // Disconnect observer when promise settles via polling path
      const origResolve = resolve;
      const origReject = reject;
      resolve = (v) => {
        observer.disconnect();
        origResolve(v);
      };
      reject = (e) => {
        observer.disconnect();
        origReject(e);
      };
    });
  }

  function normalizeUrl(url) {
    try {
      const u = new URL(url, location.href);
      u.hash = "";
      let path = u.pathname;
      if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
      }
      u.pathname = path;
      return u.origin + u.pathname + u.search;
    } catch (_) {
      return String(url || "").split("#")[0];
    }
  }

  function isListingPage() {
    return !!(
      document.querySelector(".entry-content") &&
      document.querySelector(".idr-post-item")
    );
  }

  function isArticlePage() {
    return !!document.querySelector(".idr-single-hero-left");
  }

  function getPostItems() {
    const container = document.querySelector(".entry-content");
    if (!container) return [];
    return Array.from(container.querySelectorAll(".idr-post-item"));
  }

  function getArticleLinks() {
    return getPostItems()
      .map((post) => {
        const link = post.querySelector(".idr-post-item-link");
        if (!link) return null;
        const href = link.href || link.getAttribute("href");
        if (!href) return null;
        return { post, link, url: normalizeUrl(href) };
      })
      .filter(Boolean);
  }

  function uniqueKey(base, used) {
    let key = base || "Untitled";
    if (!used.has(key)) {
      used.add(key);
      return key;
    }
    let n = 2;
    while (used.has(`${key}-${n}`)) n += 1;
    const unique = `${key}-${n}`;
    used.add(unique);
    return unique;
  }

  function firstMeaningfulHeading(el) {
    if (!el) return null;
    const headings = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const h of headings) {
      const text = (h.textContent || "").trim();
      if (text) return text;
    }
    return null;
  }

  function extractArticleItems(heroLeft) {
    const items = {};
    const used = new Set();
    let untitledCount = 0;

    const children = Array.from(heroLeft.children);

    for (const child of children) {
      const isTitleMeta = child.classList.contains(
        "idr-single-hero-title-meta-wrapper"
      );

      if (isTitleMeta) {
        const title =
          firstMeaningfulHeading(child) ||
          (() => {
            untitledCount += 1;
            return untitledCount === 1 ? "Untitled" : `Untitled-${untitledCount}`;
          })();

        const key = uniqueKey(title, used);
        items[key] = {
          voice: !!child.querySelector(".idr-audio-player"),
          translation: !!child.querySelector(".idr-translation-select"),
        };
        continue;
      }

      const heading = firstMeaningfulHeading(child);
      if (heading) {
        const key = uniqueKey(heading, used);
        items[key] = true;
      } else {
        untitledCount += 1;
        const base =
          untitledCount === 1 ? "Untitled" : `Untitled-${untitledCount}`;
        // uniqueKey still needed if "Untitled" already used via title-meta fallback
        const key = uniqueKey(base, used);
        items[key] = false;
      }
    }

    return items;
  }

  function downloadJson(filename, data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const triggerAnchor = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    if (typeof GM_download === "function") {
      try {
        GM_download({
          url,
          name: filename,
          saveAs: false,
          onerror: () => triggerAnchor(),
          ontimeout: () => triggerAnchor(),
        });
        return;
      } catch (_) {
        triggerAnchor();
        return;
      }
    }

    triggerAnchor();
  }

  function finishCrawl(state) {
    banner("CRAWL COMPLETE");
    log("");
    log(`Pages processed: ${state.pagesProcessed}`);
    log(`Articles processed: ${state.results.length}`);
    log(`Failed articles: ${state.errors.length}`);
    log("");
    log("Downloading JSON...");

    downloadJson("idr-post-scan-results.json", state.results);

    if (state.errors.length > 0) {
      downloadJson("idr-post-scan-errors.json", state.errors);
    }

    updateState({
      running: false,
      completed: true,
      phase: "done",
    });
  }

  function findNextPaginationLink(currentPageNumber) {
    const pagination = document.querySelector(".idr-pagination");
    if (!pagination) return null;

    // Prefer explicit "next" controls
    const nextCandidates = pagination.querySelectorAll(
      'a.next, a[rel="next"], .next a, a.idr-pagination-next, .pagination-next a'
    );
    for (const a of nextCandidates) {
      const href = a.href || a.getAttribute("href");
      if (href && !a.classList.contains("disabled")) return a;
    }

    // Numbered page links: click the one for currentPageNumber + 1
    const target = String(currentPageNumber + 1);
    const links = Array.from(pagination.querySelectorAll("a[href]"));
    for (const a of links) {
      const text = (a.textContent || "").trim();
      if (text === target) return a;
    }

    // Fallback: first link whose page number is greater than current
    for (const a of links) {
      const text = (a.textContent || "").trim();
      const n = parseInt(text, 10);
      if (!Number.isNaN(n) && n === currentPageNumber + 1) return a;
    }

    // Last resort: aria/label containing "next" / Hindi next equivalents
    for (const a of links) {
      const label = (
        (a.getAttribute("aria-label") || "") +
        " " +
        (a.textContent || "")
      ).toLowerCase();
      if (
        label.includes("next") ||
        label.includes("अगला") ||
        label.includes("→") ||
        label.includes("»")
      ) {
        return a;
      }
    }

    return null;
  }

  async function processArticlePage() {
    const state = loadState();
    if (!state.running || state.completed) return;

    log("Article page detected — waiting for .idr-single-hero-left ...");

    let heroLeft = null;
    try {
      await waitFor(() => !!document.querySelector(".idr-single-hero-left"));
      heroLeft = document.querySelector(".idr-single-hero-left");
    } catch (_) {
      heroLeft = null;
    }

    const url = normalizeUrl(location.href);

    if (!heroLeft) {
      log("✗ idr-single-hero-left not found");
      const errors = state.errors.slice();
      errors.push({
        url,
        error: "idr-single-hero-left not found",
      });
      const visitedArticles = state.visitedArticles.slice();
      if (!visitedArticles.includes(url)) visitedArticles.push(url);

      updateState({
        errors,
        visitedArticles,
        articleIndex: state.articleIndex + 1,
        phase: "listing",
      });
    } else {
      const items = extractArticleItems(heroLeft);
      const results = state.results.slice();
      results.push({ url, items });

      const visitedArticles = state.visitedArticles.slice();
      if (!visitedArticles.includes(url)) visitedArticles.push(url);

      updateState({
        results,
        visitedArticles,
        articleIndex: state.articleIndex + 1,
        phase: "listing",
      });

      log("✓ Article processed");
    }

    // Return to listing via browser history
    setTimeout(() => {
      history.back();
    }, 150);
  }

  async function processListingPage() {
    let state = loadState();
    if (!state.running || state.completed) return;

    try {
      await waitFor(
        () =>
          !!document.querySelector(".entry-content") &&
          !!document.querySelector(".idr-post-item")
      );
    } catch (_) {
      log("Listing page elements not found in time.");
      return;
    }

    const pageUrl = normalizeUrl(location.href);
    state = loadState();

    // First visit to this listing URL
    if (!state.visitedPages.includes(pageUrl)) {
      if (state.visitedPages.length >= MAX_PAGES) {
        // Should not process a 6th page
        finishCrawl(state);
        return;
      }

      const visitedPages = state.visitedPages.slice();
      visitedPages.push(pageUrl);
      state = updateState({
        visitedPages,
        listingUrl: pageUrl,
        articleIndex: 0,
        pageNumber: visitedPages.length,
        phase: "listing",
      });

      banner("IDR CRAWLER");
      log("");
      log(`Listing page: ${state.pageNumber}/${MAX_PAGES}`);
    } else {
      // Returning from an article — ensure listingUrl / pageNumber stay coherent
      if (!state.listingUrl) {
        state = updateState({ listingUrl: pageUrl });
      }
      log(`Resuming listing page: ${state.pageNumber}/${MAX_PAGES}`);
    }

    const links = getArticleLinks();
    log(`Found posts: ${links.length}`);
    log("");

    // Find next unprocessed article starting at articleIndex
    let idx = state.articleIndex;
    while (idx < links.length) {
      const { url, link } = links[idx];

      if (state.visitedArticles.includes(url)) {
        log(`Skipping already visited article ${idx + 1}/${links.length}`);
        idx += 1;
        state = updateState({ articleIndex: idx });
        continue;
      }

      log(`Opening article ${idx + 1}/${links.length}`);
      updateState({
        articleIndex: idx,
        phase: "article",
        listingUrl: pageUrl,
      });

      // Actual DOM click — causes navigation
      link.click();
      return;
    }

    // All articles on this page done
    log("");
    log(`Finished listing page ${state.pageNumber}`);

    const pagesProcessed = Math.max(state.pagesProcessed, state.pageNumber);
    state = updateState({
      pagesProcessed,
      articleIndex: 0,
    });

    if (state.pageNumber >= MAX_PAGES || state.visitedPages.length >= MAX_PAGES) {
      finishCrawl(state);
      return;
    }

    // Paginate via real DOM click
    const nextLink = findNextPaginationLink(state.pageNumber);
    if (!nextLink) {
      log("No next pagination link found — finishing crawl.");
      finishCrawl(state);
      return;
    }

    const nextHref = normalizeUrl(nextLink.href || nextLink.getAttribute("href"));
    if (state.visitedPages.includes(nextHref)) {
      log("Next pagination page already visited — finishing crawl.");
      finishCrawl(state);
      return;
    }

    log("");
    log(`Opening listing page ${state.pageNumber + 1}`);
    updateState({
      phase: "paginating",
      articleIndex: 0,
    });

    nextLink.click();
  }

  async function boot() {
    let state = loadState();

    // Auto-start on first run; do not restart if completed
    if (state.completed) {
      log("[IDR Crawler] Already completed. Reset with:");
      log('  sessionStorage.removeItem("idrCrawlerState"); location.reload();');
      return;
    }

    if (!state.running) {
      log("[IDR Crawler] Not running. Reset with:");
      log('  sessionStorage.removeItem("idrCrawlerState"); location.reload();');
      return;
    }

    // Guard against double-boot on same page
    if (window.__idrCrawlerBooted) return;
    window.__idrCrawlerBooted = true;

    // Persist initial listing URL if starting fresh
    if (!sessionStorage.getItem(STATE_KEY)) {
      saveState({
        ...DEFAULT_STATE,
        listingUrl: normalizeUrl(location.href),
      });
      banner("IDR CRAWLER");
      log("");
      log("Starting crawler...");
      log('Reset anytime: sessionStorage.removeItem("idrCrawlerState")');
      log("");
    }

    // Wait until document is at least interactive
    if (document.readyState === "loading") {
      await new Promise((r) =>
        document.addEventListener("DOMContentLoaded", r, { once: true })
      );
    }

    // Prefer article detection when hero exists; otherwise listing
    // Poll briefly so SPA-ish themes can paint
    try {
      await waitFor(
        () => isListingPage() || isArticlePage() || !!document.body,
        10000
      );
    } catch (_) {
      /* continue with best-effort detection */
    }

    if (isArticlePage() || (state.phase === "article" && !isListingPage())) {
      await processArticlePage();
      return;
    }

    if (isListingPage()) {
      await processListingPage();
      return;
    }

    // Ambiguous page: if we expected an article, try waiting a bit more
    if (state.phase === "article") {
      try {
        await waitFor(() => isArticlePage(), 8000);
        await processArticlePage();
        return;
      } catch (_) {
        const url = normalizeUrl(location.href);
        const errors = state.errors.slice();
        errors.push({
          url,
          error: "idr-single-hero-left not found",
        });
        const visitedArticles = state.visitedArticles.slice();
        if (!visitedArticles.includes(url)) visitedArticles.push(url);
        updateState({
          errors,
          visitedArticles,
          articleIndex: state.articleIndex + 1,
          phase: "listing",
        });
        history.back();
        return;
      }
    }

    log("[IDR Crawler] Neither listing nor article page detected. Waiting...");
  }

  // Expose helpers for manual control from the console
  window.idrCrawlerReset = function () {
    sessionStorage.removeItem(STATE_KEY);
    location.reload();
  };

  window.idrCrawlerStop = function () {
    updateState({ running: false });
    log("[IDR Crawler] Stopped.");
  };

  boot().catch((err) => {
    console.error("[IDR Crawler] Fatal error:", err);
  });
})();
