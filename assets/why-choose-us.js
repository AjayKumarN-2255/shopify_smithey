document.addEventListener("DOMContentLoaded", () => {
    const faqItems = document.querySelectorAll(".why-us-faq-item");

    faqItems.forEach((item) => {
        const toggle = item.querySelector(".why-us-faq-toggle");
        const content = item.querySelector(".why-us-faq-content");

        toggle.addEventListener("click", () => {
            const isActive = item.classList.contains("active");

            // Close all items
            faqItems.forEach((faq) => {
                faq.classList.remove("active");
                faq.querySelector(".why-us-faq-content").style.maxHeight = "0";
            });

            // Open clicked item
            if (!isActive) {
                item.classList.add("active");
                content.style.maxHeight = content.scrollHeight + 30 + "px";
            }
        });
    });
});