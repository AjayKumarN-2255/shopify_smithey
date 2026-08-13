document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('[data-retailers-page]');

    if (!page) return;

    const searchForm = document.querySelector('[data-retailers-search]');
    const searchInput = document.querySelector('[data-retailers-search-input]');
    const retailerList = document.querySelector('[data-retailers-list]');
    const resultsCount = document.querySelector('[data-retailers-count]');
    const emptyState = document.querySelector('[data-retailers-empty]');
    const locationButton = document.querySelector(
        '[data-retailers-location-button]'
    );
    const locationMessage = document.querySelector(
        '[data-retailers-location-message]'
    );
    const mapElement = document.querySelector('[data-retailers-map]');
    const dataElement = document.querySelector('[data-retailers-data]');

    if (!dataElement || !retailerList) return;

    const retailers = parseRetailersData(dataElement);
    const initialRetailers = retailers.slice(0, 3);

    let map;
    let userMarker = null;
    let userLocation = null;
    const markersById = new Map();

    initRetailersPage();


    function parseRetailersData(element) {
        const raw = (element.textContent || '').trim();

        if (!raw) return [];

        let parsed;

        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return [];
        }

        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            } catch (error) {
                return [];
            }
        }

        if (!Array.isArray(parsed)) return [];

        return parsed.filter((retailer) => {
            return retailer && typeof retailer === 'object' && retailer.id;
        });
    }


    function initRetailersPage() {
        bindEvents();

        if (mapElement && typeof window.L !== 'undefined') {
            initMap();
            createMarkers(retailers);
        } else {
            showLocationMessage(
                'The map could not be loaded. You can still search retailers by city, ZIP, or address.'
            );
        }

        showRetailers(initialRetailers);
    }


    /*
     * Initialize Leaflet map once
     */
    function initMap() {
        map = L.map(mapElement, {
            scrollWheelZoom: true
        }).setView([39.8283, -98.5795], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        refreshMapSize();

        window.addEventListener('resize', () => {
            refreshMapSize();
        });
    }


    function refreshMapSize() {
        if (!map) return;

        requestAnimationFrame(() => {
            if (!map) return;
            map.invalidateSize();
        });
    }


    function createMarkers(retailersToShow) {
        if (!map) return;

        retailersToShow.forEach((retailer) => {
            if (markersById.has(retailer.id)) return;

            const lat = Number(retailer.lat);
            const lng = Number(retailer.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const marker = L.marker([lat, lng], {
                title: retailer.name
            });

            marker.bindPopup(getPopupContent(retailer));

            marker.on('click', () => {
                selectRetailer(retailer.id, { fromMarker: true });
            });

            marker.addTo(map);
            markersById.set(retailer.id, marker);
        });
    }


    function updateVisibleMarkers(retailersToShow) {
        if (!map) return;

        const visibleIds = new Set(
            retailersToShow.map((retailer) => retailer.id)
        );

        markersById.forEach((marker, retailerId) => {
            const shouldShow = visibleIds.has(retailerId);
            const isOnMap = map.hasLayer(marker);

            if (shouldShow && !isOnMap) {
                marker.addTo(map);
            } else if (!shouldShow && isOnMap) {
                map.removeLayer(marker);
            }
        });

        createMarkers(retailersToShow);
    }


    function fitMapToRetailers(retailersToShow, includeUserLocation) {
        if (!map) return;

        const points = retailersToShow
            .map((retailer) => [
                Number(retailer.lat),
                Number(retailer.lng)
            ])
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

        if (includeUserLocation && userLocation) {
            points.push([userLocation.lat, userLocation.lng]);
        }

        if (!points.length) return;

        if (points.length === 1) {
            map.setView(points[0], 12);
            return;
        }

        map.fitBounds(points, {
            padding: [40, 40],
            maxZoom: 14
        });
    }


    function getPopupContent(retailer) {
        const cityState = [retailer.city, retailer.state]
            .filter(Boolean)
            .join(', ');

        return `
            <strong>${escapeHtml(retailer.name)}</strong>
            <br>
            ${escapeHtml(retailer.address || '')}
            <br>
            ${escapeHtml(cityState)}
            <br>
            ${escapeHtml(retailer.postal_code || '')}
        `;
    }


    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }


    function searchRetailers(query) {
        const searchTerm = query.trim().toLowerCase();

        if (!searchTerm) {
            showRetailers(initialRetailers);
            return;
        }

        const filteredRetailers = retailers.filter((retailer) => {
            const searchableText = [
                retailer.name,
                retailer.address,
                retailer.city,
                retailer.state,
                retailer.country,
                retailer.postal_code
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(searchTerm);
        });

        showRetailers(filteredRetailers);
    }


    function showRetailers(retailersToShow, options = {}) {
        renderRetailerList(retailersToShow);
        updateResultsCount(retailersToShow.length);

        if (emptyState) {
            emptyState.hidden = retailersToShow.length !== 0;
        }

        updateVisibleMarkers(retailersToShow);

        if (!retailersToShow.length) {
            if (map) {
                map.closePopup();
            }

            refreshMapSize();
            return;
        }

        const selectedRetailer = retailersToShow[0];

        if (options.includeUserLocation && userLocation) {
            fitMapToRetailers([selectedRetailer], true);
            selectRetailer(selectedRetailer.id, { centerMap: false });
            refreshMapSize();
            return;
        }

        if (retailersToShow.length > 1 && !options.skipFit) {
            fitMapToRetailers(retailersToShow, false);
        }

        selectRetailer(selectedRetailer.id);
        refreshMapSize();
    }


    /*
     * Render the visible retailer/vendor cards from dummy JSON
     */
    function renderRetailerList(results) {
        retailerList.innerHTML = '';

        results.forEach((retailer) => {
            const listItem = document.createElement('li');
            listItem.className = 'retailers-list-item';
            listItem.appendChild(createRetailerCard(retailer));
            retailerList.appendChild(listItem);
        });
    }


    function createRetailerCard(retailer) {
        const article = document.createElement('article');
        article.className = 'retailer-card';
        article.setAttribute('data-retailer-card', '');
        article.setAttribute('data-retailer-id', retailer.id);
        article.setAttribute('data-lat', String(retailer.lat));
        article.setAttribute('data-lng', String(retailer.lng));

        const name = document.createElement('h2');
        name.className = 'retailer-card__name';
        name.setAttribute('data-retailer-name', '');
        name.textContent = retailer.name || '';
        article.appendChild(name);

        const address = document.createElement('address');
        address.className = 'retailer-card__address';
        address.setAttribute('data-retailer-address', '');

        if (retailer.address) {
            address.appendChild(document.createTextNode(retailer.address));
        }

        const cityState = [retailer.city, retailer.state]
            .filter(Boolean)
            .join(', ');
        const cityStateZip = [cityState, retailer.postal_code]
            .filter(Boolean)
            .join(' ');

        if (cityStateZip) {
            address.appendChild(document.createElement('br'));
            address.appendChild(document.createTextNode(cityStateZip));
        }

        if (retailer.country) {
            address.appendChild(document.createElement('br'));
            address.appendChild(document.createTextNode(retailer.country));
        }

        article.appendChild(address);

        const distance = document.createElement('p');
        distance.className = 'retailer-card__distance';
        distance.setAttribute('data-retailer-distance', '');

        if (typeof retailer.distance === 'number' && Number.isFinite(retailer.distance)) {
            distance.textContent = `${retailer.distance.toFixed(1)} miles away`;
        } else {
            distance.hidden = true;
        }

        article.appendChild(distance);

        if (retailer.phone) {
            const phone = document.createElement('p');
            phone.className = 'retailer-card__phone';
            phone.setAttribute('data-retailer-phone', '');

            const phoneLink = document.createElement('a');
            phoneLink.href = `tel:${String(retailer.phone).replace(/[\s()\-]/g, '')}`;
            phoneLink.textContent = retailer.phone;
            phone.appendChild(phoneLink);
            article.appendChild(phone);
        }

        if (retailer.website) {
            const website = document.createElement('p');
            website.className = 'retailer-card__website';
            website.setAttribute('data-retailer-website', '');

            const websiteLink = document.createElement('a');
            websiteLink.href = retailer.website;
            websiteLink.target = '_blank';
            websiteLink.rel = 'noopener noreferrer';
            websiteLink.textContent = 'Visit website';
            website.appendChild(websiteLink);
            article.appendChild(website);
        }

        if (retailer.hours) {
            const hours = document.createElement('p');
            hours.className = 'retailer-card__hours';
            hours.setAttribute('data-retailer-hours', '');
            hours.textContent = retailer.hours;
            article.appendChild(hours);
        }

        article.addEventListener('click', (event) => {
            if (event.target.closest('a')) return;
            selectRetailer(retailer.id);
        });

        return article;
    }


    function getRetailerCards() {
        return retailerList.querySelectorAll('[data-retailer-card]');
    }


    function updateResultsCount(count) {
        if (!resultsCount) return;

        resultsCount.textContent =
            count === 1
                ? '1 retailer found'
                : `${count} retailers found`;
    }


    function selectRetailer(retailerId, options = {}) {
        const { fromMarker = false, centerMap = true } = options;

        getRetailerCards().forEach((card) => {
            card.dataset.selected =
                card.dataset.retailerId === String(retailerId)
                    ? 'true'
                    : 'false';
        });

        const selectedCard = retailerList.querySelector(
            `[data-retailer-card][data-retailer-id="${retailerId}"]`
        );

        if (selectedCard && fromMarker) {
            selectedCard.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }

        const retailer = retailers.find((item) => item.id === retailerId);
        const marker = markersById.get(retailerId);

        if (!retailer) return;

        if (marker && map) {
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }

            if (centerMap) {
                map.setView(
                    [Number(retailer.lat), Number(retailer.lng)],
                    14
                );
            }

            marker.openPopup();
            return;
        }

        if (centerMap && map) {
            map.setView(
                [Number(retailer.lat), Number(retailer.lng)],
                14
            );
        }
    }


    function bindEvents() {
        if (searchForm) {
            searchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                searchRetailers(searchInput.value);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchRetailers(searchInput.value);
            });
        }

        if (locationButton) {
            locationButton.addEventListener('click', useMyLocation);
        }
    }


    function useMyLocation() {
        if (!navigator.geolocation) {
            showLocationMessage(
                'Location is not supported by your browser. You can still search by city, ZIP, or address.'
            );
            return;
        }

        locationButton.disabled = true;
        showLocationMessage('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setUserLocationMarker(userLocation);
                findNearestRetailers(userLocation);
                locationButton.disabled = false;
            },
            (error) => {
                locationButton.disabled = false;
                showLocationMessage(getGeolocationErrorMessage(error));
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }


    function getGeolocationErrorMessage(error) {
        if (error && error.code === error.PERMISSION_DENIED) {
            return 'Location access was denied. You can still search by city, ZIP, or address.';
        }

        if (error && error.code === error.TIMEOUT) {
            return 'We could not get your location in time. Try searching by city or ZIP instead.';
        }

        return 'Unable to get your location. You can still search by city, ZIP, or address.';
    }


    function showLocationMessage(message) {
        if (!locationMessage) return;

        locationMessage.textContent = message;
        locationMessage.hidden = !message;
    }


    function setUserLocationMarker(location) {
        if (!map) return;

        const latLng = [location.lat, location.lng];

        if (userMarker) {
            userMarker.setLatLng(latLng);
            return;
        }

        userMarker = L.circleMarker(latLng, {
            radius: 8,
            color: '#112626',
            weight: 2,
            fillColor: '#112626',
            fillOpacity: 0.9
        })
            .bindPopup('Your location')
            .addTo(map);
    }


    function findNearestRetailers(location) {
        const retailersWithDistance = retailers.map((retailer) => {
            const distance = calculateDistance(
                location.lat,
                location.lng,
                Number(retailer.lat),
                Number(retailer.lng)
            );

            return {
                ...retailer,
                distance
            };
        });

        retailersWithDistance.sort((a, b) => a.distance - b.distance);

        showRetailers(retailersWithDistance, {
            includeUserLocation: true
        });
    }


    function calculateDistance(lat1, lng1, lat2, lng2) {
        const earthRadius = 3958.8;
        const latDifference = toRadians(lat2 - lat1);
        const lngDifference = toRadians(lng2 - lng1);
        const a =
            Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
            Math.cos(toRadians(lat1)) *
                Math.cos(toRadians(lat2)) *
                Math.sin(lngDifference / 2) *
                Math.sin(lngDifference / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadius * c;
    }


    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
});
