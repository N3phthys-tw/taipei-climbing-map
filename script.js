/**
 * Taipei Climbing Gym Map - DEPTH Optimized Version
 */

const App = (() => {
    let allGyms = [];
    let currentGyms = [];
    let mapInstance = null;
    let markerClusterGroup = null;
    let userMarker = null;

    // 1. DataFetcher Module
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            } catch (error) {
                console.error('Fetching gyms failed:', error);
                return [];
            }
        }
    };

    // 2. InfoWindow Module
    const InfoWindow = {
        render(gym) {
            const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
            const types = typeList.map(t => {
                const className = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                return `<span class="${className}">${t}</span>`;
            }).join('');

            return `
                <div class="gym-info-window">
                    <h3>${gym.name}</h3>
                    <p><span class="label">🏢 行政區:</span> ${gym.district}</p>
                    <p><span class="label">📍 地址:</span> ${gym.address || gym.addr}</p>
                    <p><span class="label">📞 電話:</span> ${gym.phone || gym.tel}</p>
                    <p><span class="label">🕒 營業:</span> ${gym.operatingHours || '請洽場館'}</p>
                    <div class="tag-container"><span class="label">🧗 類型:</span> ${types}</div>
                    <a href="${gym.website || '#'}" target="_blank">造訪官網 &rarr;</a>
                </div>
            `;
        }
    };

    // 3. MapContainer Module
    const MapContainer = {
        init() {
            mapInstance = L.map('map').setView([25.045, 121.53], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance);
            
            markerClusterGroup = L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true
            });
            mapInstance.addLayer(markerClusterGroup);

            return mapInstance;
        }
    };

    // 4. MarkerManager Module
    const MarkerManager = {
        updateMarkers(gyms) {
            markerClusterGroup.clearLayers();
            gyms.forEach(gym => {
                const lat = gym.lat || (gym.location && gym.location.lat);
                const lng = gym.lng || (gym.location && gym.location.lng);

                if (lat && lng) {
                    const marker = L.marker([lat, lng]);
                    marker.bindPopup(InfoWindow.render(gym), {
                        className: 'custom-popup',
                        offset: [0, -32]
                    });
                    marker.gymId = gym.id;
                    markerClusterGroup.addLayer(marker);
                }
            });
        },
        openPopupForGym(gymId) {
            const layers = markerClusterGroup.getLayers();
            const targetMarker = layers.find(layer => layer.gymId === gymId);
            if (targetMarker) {
                markerClusterGroup.zoomToShowLayer(targetMarker, () => {
                    targetMarker.openPopup();
                });
            }
        }
    };

    // 5. SidebarManager Module
    const SidebarManager = {
        renderList(gyms) {
            const listContainer = document.getElementById('gym-list');
            listContainer.innerHTML = '';

            if (gyms.length === 0) {
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;"><i class="fas fa-search" style="font-size: 2rem; display: block; margin-bottom: 10px; opacity: 0.5;"></i>找不到符合條件的場館</div>';
                return;
            }

            gyms.forEach(gym => {
                const item = document.createElement('div');
                item.className = 'gym-list-item';
                const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
                item.innerHTML = `
                    <h4>${gym.name}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${gym.district}</p>
                    <div class="tag-container">${typeList.map(t => `<span class="${t.includes('抱石') ? 'tag-bouldering' : 'tag-lead'}" style="font-size: 0.7rem;">${t}</span>`).join('')}</div>
                `;

                item.addEventListener('click', () => {
                    MarkerManager.openPopupForGym(gym.id);
                    if (window.innerWidth <= 768) {
                        document.getElementById('map-container').scrollIntoView({ behavior: 'smooth' });
                    }
                });
                listContainer.appendChild(item);
            });
        }
    };

    // 6. FilterManager Module (AND Logic)
    const FilterManager = {
        init() {
            const searchInput = document.getElementById('search-input');
            const typeCheckboxes = document.querySelectorAll('.type-filter');

            searchInput.addEventListener('input', () => this.applyFilters());
            typeCheckboxes.forEach(cb => cb.addEventListener('change', () => this.applyFilters()));
        },
        applyFilters() {
            const searchText = document.getElementById('search-input').value.toLowerCase();
            const selectedTypes = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);

            currentGyms = allGyms.filter(gym => {
                // 搜尋邏輯：行政區或場館名稱
                const matchSearch = gym.district.toLowerCase().includes(searchText) || 
                                   gym.name.toLowerCase().includes(searchText);
                
                // 類型邏輯：需符合選中的任何一個類型 (OR among checkboxes)
                const gymTypes = Array.isArray(gym.type) ? gym.type : [gym.type];
                const matchType = selectedTypes.length === 0 ? false : 
                                 selectedTypes.some(st => gymTypes.some(gt => gt.includes(st)));

                return matchSearch && matchType;
            });

            SidebarManager.renderList(currentGyms);
            MarkerManager.updateMarkers(currentGyms);
        }
    };

    // 7. GeolocationManager (Fallback to Neihu)
    const GeolocationManager = {
        fallbackCoord: [25.07455, 121.57792], // 內湖區瑞光路 (沐訊科技附近)
        
        init() {
            const geoBtn = document.getElementById('geo-btn');
            geoBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    this.useFallback("您的瀏覽器不支援地理定位。");
                    return;
                }

                geoBtn.classList.add('active');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        this.updateUserMarker(lat, lng, "您在這裡");
                        mapInstance.setView([lat, lng], 14);
                        geoBtn.classList.remove('active');
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        this.useFallback("無法取得您的位置，已跳轉至預設地點（內湖瑞光路）。");
                        geoBtn.classList.remove('active');
                    }
                );
            });
        },
        useFallback(message) {
            alert(message);
            const [lat, lng] = this.fallbackCoord;
            this.updateUserMarker(lat, lng, "預設位置：內湖瑞光路", "#95a5a6");
            mapInstance.setView([lat, lng], 14);
        },
        updateUserMarker(lat, lng, label, color = "#3498db") {
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
                userMarker.setStyle({ fillColor: color });
            } else {
                userMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(mapInstance);
            }
            userMarker.bindPopup(label).openPopup();
        }
    };

    async function init() {
        MapContainer.init();
        allGyms = await DataFetcher.fetchGyms();
        currentGyms = [...allGyms];
        
        FilterManager.init();
        SidebarManager.renderList(currentGyms);
        MarkerManager.updateMarkers(currentGyms);
        GeolocationManager.init();
        
        console.log("台北市攀岩地圖 - DEPTH 優化版已啟動");
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
