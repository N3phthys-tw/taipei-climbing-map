/**
 * Taipei Climbing Map - User-Driven Refactored Version
 * Focus: User Geolocation as default start + Fixed Sidebar Tags
 */

const App = (() => {
    let allGyms = [];
    let currentGyms = [];
    let mapInstance = null;
    let markerClusterGroup = null;
    let userLocation = null; // Global Source of Truth
    let userMarker = null;
    let routingControl = null;
    let spotlightLayer = null;
    let activeDistrict = null;
    let currentOpenedMarker = null;
    let baseLayers = {};
    let currentBaseLayer = null;

    // 0. Map Layer Manager
    const LayerManager = {
        init() {
            baseLayers = {
                standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }),
                dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; CartoDB'
                }),
                satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: '&copy; Esri World Imagery'
                })
            };

            const savedStyle = localStorage.getItem('map_style') || 'standard';
            this.switchLayer(savedStyle);

            // UI Listeners
            const styleBtn = document.getElementById('style-btn');
            const styleMenu = document.getElementById('style-menu');
            
            styleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                styleMenu.classList.toggle('hidden');
            });

            document.querySelectorAll('.style-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const style = opt.dataset.style;
                    this.switchLayer(style);
                    styleMenu.classList.add('hidden');
                });
            });

            document.addEventListener('click', () => styleMenu.classList.add('hidden'));
        },
        switchLayer(style) {
            if (currentBaseLayer) mapInstance.removeLayer(currentBaseLayer);
            currentBaseLayer = baseLayers[style];
            currentBaseLayer.addTo(mapInstance);
            localStorage.setItem('map_style', style);
        }
    };

    // 1. DataFetcher Module
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                return await response.json();
            } catch (error) { return []; }
        },
        async fetchDistricts() {
            try {
                const response = await fetch('./taipei-districts.json');
                return await response.json();
            } catch (error) { return null; }
        }
    };

    // 2. InfoWindow Module (Rich Template)
    const InfoWindow = {
        render(gym, navData = null) {
            const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
            const types = typeList.map(t => {
                const cls = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                return `<span class="${cls}">${t}</span>`;
            }).join('');

            return `
                <div class="gym-detail-card" id="card-${gym.id}">
                    <div class="gym-detail-header">
                        <h2>${gym.name}</h2>
                        <div class="tag-container">${types}</div>
                    </div>
                    <div class="gym-detail-body">
                        <div class="detail-row">
                            <span class="icon"><i class="fas fa-map-marker-alt"></i></span>
                            <div class="content"><span class="label">地址:</span>${gym.address || gym.addr}</div>
                        </div>
                        <div class="detail-row">
                            <span class="icon"><i class="fas fa-phone"></i></span>
                            <div class="content"><span class="label">電話:</span>${gym.phone || '暫無資訊'}</div>
                        </div>
                        <div class="detail-row">
                            <span class="icon"><i class="fas fa-clock"></i></span>
                            <div class="content"><span class="label">營業:</span>${gym.operatingHours || '請洽場館'}</div>
                        </div>
                    </div>
                    <div id="nav-section-${gym.id}" class="gym-detail-nav ${navData ? '' : 'hidden'}">
                        <div class="nav-summary-mini">
                            <span class="time">${navData ? navData.time : '--'} 分鐘</span>
                            <span class="dist">${navData ? navData.dist : '--'} km (自您的位置)</span>
                        </div>
                        <i class="fas fa-car" style="color:#3498db;"></i>
                    </div>
                    <div class="btn-group">
                        <button class="btn-primary" onclick="App.startNavigation('${gym.id}', ${gym.location.lat}, ${gym.location.lng}, '${gym.district}')">
                            <i class="fas fa-directions"></i> 規劃路徑
                        </button>
                        <a href="${gym.website || '#'}" target="_blank" class="btn-secondary">官方網站</a>
                    </div>
                </div>
            `;
        }
    };

    // 3. MapContainer Module (Spotlight)
    const MapContainer = {
        async init(centerCoord) {
            mapInstance = L.map('map', { zoomControl: false }).setView(centerCoord, 14);
            L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
            
            // Initializing LayerManager (Tiles)
            LayerManager.init();

            const districtData = await DataFetcher.fetchDistricts();
            if (districtData) {
                spotlightLayer = L.geoJSON(districtData, { 
                    style: this.getSpotlightStyle, 
                    className: 'spotlight-mask' 
                }).addTo(mapInstance);
            }
            markerClusterGroup = L.markerClusterGroup({ disableClusteringAtZoom: 15 }).addTo(mapInstance);
        },
        getSpotlightStyle(feature) {
            const props = feature.properties;
            const townName = (props.TOWN || props.TNAME || "").replace(/\s/g, "");
            const isTarget = activeDistrict && townName.includes(activeDistrict);
            return {
                fillColor: isTarget ? 'transparent' : '#000',
                fillOpacity: activeDistrict ? (isTarget ? 0 : 0.6) : 0,
                color: isTarget ? '#3498db' : 'transparent',
                weight: isTarget ? 3 : 0,
                transition: 'fill-opacity 0.4s ease'
            };
        },
        updateSpotlight(districtName) {
            activeDistrict = districtName;
            if (spotlightLayer) spotlightLayer.setStyle(this.getSpotlightStyle);
        }
    };

    // 4. Navigation & Geolocation Manager
    const NavigationManager = {
        init(coord) {
            this.updateUserMarker(coord[0], coord[1]);
            document.getElementById('nav-close').addEventListener('click', () => this.reset());
        },
        updateUserMarker(lat, lng) {
            userLocation = [lat, lng];
            if (userMarker) mapInstance.removeLayer(userMarker);
            userMarker = L.circleMarker([lat, lng], {
                radius: 10, fillColor: '#e74c3c', color: '#fff', weight: 3, fillOpacity: 0.9
            }).addTo(mapInstance).bindPopup("您的目前位置").openPopup();
        },
        calculateRoute(gymId, lat, lng, district) {
            if (!userLocation) {
                alert("請先開啟定位功能以計算路徑。");
                return;
            }
            this.clear();
            MapContainer.updateSpotlight(district);
            
            routingControl = L.Routing.control({
                waypoints: [L.latLng(userLocation), L.latLng(lat, lng)],
                show: false, 
                addWaypoints: false,
                fitSelectedRoutes: true,
                lineOptions: { styles: [{ color: '#3498db', opacity: 0.8, weight: 6 }] },
                createMarker: () => null
            }).addTo(mapInstance);

            routingControl.on('routesfound', (e) => {
                const summary = e.routes[0].summary;
                const time = Math.round(summary.totalTime / 60);
                const dist = (summary.totalDistance / 1000).toFixed(1);
                
                document.getElementById('nav-summary').classList.remove('hidden');
                document.getElementById('nav-time').textContent = `${time} 分鐘`;
                document.getElementById('nav-dist').textContent = `${dist} km`;
                
                const navSection = document.getElementById(`nav-section-${gymId}`);
                if (navSection) {
                    navSection.classList.remove('hidden');
                    navSection.innerHTML = `
                        <div class="nav-summary-mini">
                            <span class="time">${time} 分鐘</span>
                            <span class="dist">${dist} km (自您位置)</span>
                        </div>
                        <i class="fas fa-car" style="color:#3498db;"></i>
                    `;
                    if (currentOpenedMarker) currentOpenedMarker.getPopup().update();
                }
                mapInstance.fitBounds(L.latLngBounds(e.routes[0].coordinates), { padding: [50, 50] });
            });
        },
        reset() {
            this.clear();
            MapContainer.updateSpotlight(null);
            document.getElementById('nav-summary').classList.add('hidden');
            if (userLocation) mapInstance.setView(userLocation, 14);
        },
        clear() {
            if (routingControl) {
                mapInstance.removeControl(routingControl);
                routingControl = null;
            }
        }
    };

    // 5. Sidebar Manager (Fixed with Tags)
    const SidebarManager = {
        renderList(gyms) {
            const container = document.getElementById('gym-list');
            if (gyms.length === 0) {
                container.innerHTML = '<div class="no-results">找不到符合條件的場館</div>';
                return;
            }

            container.innerHTML = gyms.map(gym => {
                const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
                const typeTags = typeList.map(t => {
                    const cls = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                    return `<span class="${cls}" style="font-size:0.65rem; padding:1px 5px; margin-right:4px;">${t}</span>`;
                }).join('');

                return `
                    <div class="gym-list-item" onclick="App.focusGym('${gym.id}')">
                        <h4>${gym.name}</h4>
                        <p><i class="fas fa-map-marker-alt"></i> ${gym.district}</p>
                        <div class="tag-container" style="margin-top:6px;">${typeTags}</div>
                    </div>
                `;
            }).join('');
        }
    };

    // 6. App Lifecycle
    async function init() {
        const fallback = [25.0478, 121.5170]; // 台北車站
        
        // Step 1: Request Geolocation Priority
        const getLocation = () => new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(fallback);
            navigator.geolocation.getCurrentPosition(
                (p) => resolve([p.coords.latitude, p.coords.longitude]),
                () => {
                    console.warn("Location denied, using fallback.");
                    alert("提示：定位失敗或遭拒絕，地圖將以台北車站為中心開啟。");
                    resolve(fallback);
                },
                { timeout: 5000 }
            );
        });

        const startCoord = await getLocation();
        
        // Step 2: Initialize UI
        await MapContainer.init(startCoord);
        allGyms = await DataFetcher.fetchGyms();
        currentGyms = [...allGyms];
        
        NavigationManager.init(startCoord);
        
        // Initial Rendering
        SidebarManager.renderList(allGyms);
        const updateMarkers = (gyms) => {
            markerClusterGroup.clearLayers();
            gyms.forEach(gym => {
                const marker = L.marker([gym.location.lat, gym.location.lng]);
                marker.bindPopup(InfoWindow.render(gym), { className: 'custom-popup', offset: [0, -32], maxWidth: 300 });
                marker.on('click', () => { currentOpenedMarker = marker; });
                marker.on('popupclose', () => { if (!activeDistrict) NavigationManager.clear(); currentOpenedMarker = null; });
                markerClusterGroup.addLayer(marker);
            });
        };
        updateMarkers(allGyms);

        // Step 3: Global Event Listeners
        document.getElementById('search-input').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const selectedTypes = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);

            currentGyms = allGyms.filter(gym => {
                const matchSearch = gym.district.toLowerCase().includes(val) || gym.name.toLowerCase().includes(val);
                const gymTypes = Array.isArray(gym.type) ? gym.type : [gym.type];
                const matchType = selectedTypes.length === 0 ? false : selectedTypes.some(st => gymTypes.some(gt => gt.includes(st)));
                return matchSearch && matchType;
            });

            updateMarkers(currentGyms);
            SidebarManager.renderList(currentGyms);
        });

        document.querySelectorAll('.type-filter').forEach(cb => {
            cb.addEventListener('change', () => document.getElementById('search-input').dispatchEvent(new Event('input')));
        });

        document.getElementById('geo-btn').addEventListener('click', () => {
            navigator.geolocation.getCurrentPosition(p => {
                const coord = [p.coords.latitude, p.coords.longitude];
                NavigationManager.updateUserMarker(coord[0], coord[1]);
                mapInstance.setView(coord, 15);
            }, () => alert("定位失敗。"));
        });

        console.log("台北市攀岩地圖 - 定位驅動重構版啟動完成");
    }

    return { 
        init,
        startNavigation: (id, lat, lng, dist) => NavigationManager.calculateRoute(id, lat, lng, dist),
        focusGym: (id) => {
            const gym = allGyms.find(g => g.id === id);
            if (gym) {
                mapInstance.setView([gym.location.lat, gym.location.lng], 15);
                const layers = markerClusterGroup.getLayers();
                const m = layers.find(l => l.getLatLng().lat === gym.location.lat);
                if (m) m.openPopup();
            }
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
