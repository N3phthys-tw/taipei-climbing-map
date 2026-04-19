/**
 * Taipei Climbing Map - Japanese Minimalist Edition
 * Visual Theme: Low saturation, Airy layout, Glassmorphism
 */

const App = (() => {
    let allGyms = [];
    let currentGyms = [];
    let mapInstance = null;
    let markerClusterGroup = null;
    let userLocation = null;
    let userMarker = null;
    let routingControl = null;
    let spotlightLayer = null;
    let activeDistrict = null;
    let currentOpenedMarker = null;
    let baseLayers = {};
    let currentBaseLayer = null;

    // 0. GIS & Layer Management
    const LayerManager = {
        init() {
            baseLayers = {
                standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
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

            const styleBtn = document.getElementById('style-btn');
            const styleMenu = document.getElementById('style-menu');
            
            styleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                styleMenu.classList.toggle('hidden');
            });

            document.querySelectorAll('.style-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    this.switchLayer(opt.dataset.style);
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

    // 1. Data Service
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

    // 2. InfoWindow UI (Minimal Japanese Style)
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
                            <div class="content">${gym.address || gym.addr}</div>
                        </div>
                        <div class="detail-row">
                            <span class="icon"><i class="fas fa-phone"></i></span>
                            <div class="content">${gym.phone || '暫無資訊'}</div>
                        </div>
                        <div class="detail-row">
                            <span class="icon"><i class="fas fa-clock"></i></span>
                            <div class="content">${gym.operatingHours || '請洽場館'}</div>
                        </div>
                    </div>
                    
                    <div id="nav-section-${gym.id}" class="gym-detail-nav ${navData ? '' : 'hidden'}">
                        <div class="nav-summary-mini">
                            <span class="time">${navData ? navData.time : '--'} MIN</span>
                            <span class="dist">${navData ? navData.dist : '--'} KM</span>
                        </div>
                        <i class="fas fa-car" style="color:var(--accent-bouldering);"></i>
                    </div>

                    <div class="btn-group">
                        <button class="btn-primary" onclick="App.startNavigation('${gym.id}', ${gym.location.lat}, ${gym.location.lng}, '${gym.district}')">
                            <i class="fas fa-location-arrow"></i> 規劃路徑
                        </button>
                        <a href="${gym.website || '#'}" target="_blank" class="btn-secondary">
                            <i class="fas fa-external-link-alt"></i> 官網
                        </a>
                    </div>
                </div>
            `;
        }
    };

    // 3. Navigation & Spotlight Engine
    const NavigationManager = {
        init() {
            document.getElementById('nav-close').addEventListener('click', () => this.reset());
        },
        updateUserMarker(lat, lng) {
            userLocation = [lat, lng];
            if (userMarker) mapInstance.removeLayer(userMarker);
            userMarker = L.circleMarker([lat, lng], {
                radius: 8, fillColor: '#e74c3c', color: '#fff', weight: 2, fillOpacity: 0.8
            }).addTo(mapInstance).bindPopup("YOU ARE HERE").openPopup();
        },
        calculateRoute(gymId, lat, lng, district) {
            if (!userLocation) { alert("請先開啟定位。"); return; }
            this.clear();
            App.updateSpotlight(district);
            
            routingControl = L.Routing.control({
                waypoints: [L.latLng(userLocation), L.latLng(lat, lng)],
                show: false, 
                addWaypoints: false,
                fitSelectedRoutes: true,
                lineOptions: { styles: [{ color: 'var(--accent-action)', opacity: 0.8, weight: 5 }] },
                createMarker: () => null
            }).addTo(mapInstance);

            routingControl.on('routesfound', (e) => {
                const summary = e.routes[0].summary;
                const time = Math.round(summary.totalTime / 60);
                const dist = (summary.totalDistance / 1000).toFixed(1);
                
                // Show Floating Card
                const badge = document.getElementById('nav-summary');
                document.getElementById('nav-time').textContent = `${time} 分鐘`;
                document.getElementById('nav-dist').textContent = `${dist} 公里`;
                badge.classList.remove('hidden');
                
                // Update InfoWindow
                const navSection = document.getElementById(`nav-section-${gymId}`);
                if (navSection) {
                    navSection.classList.remove('hidden');
                    navSection.innerHTML = `
                        <div class="nav-summary-mini">
                            <span class="time">${time} MIN</span>
                            <span class="dist">${dist} KM (自您的位置)</span>
                        </div>
                        <i class="fas fa-car" style="color:var(--accent-bouldering);"></i>
                    `;
                    if (currentOpenedMarker) currentOpenedMarker.getPopup().update();
                }
                mapInstance.fitBounds(L.latLngBounds(e.routes[0].coordinates), { padding: [80, 80] });
            });
        },
        reset() {
            this.clear();
            App.updateSpotlight(null);
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

    // 4. Sidebar Manager (Japanese Styling)
    const SidebarManager = {
        renderList(gyms) {
            const container = document.getElementById('gym-list');
            if (gyms.length === 0) {
                container.innerHTML = '<div style="padding:40px; text-align:center; color:#CCC;"><i class="fas fa-wind" style="font-size:2rem; margin-bottom:10px;"></i><br>NO RESULTS</div>';
                return;
            }

            container.innerHTML = gyms.map(gym => {
                const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
                const typeTags = typeList.map(t => {
                    const cls = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                    return `<span class="${cls}">${t}</span>`;
                }).join('');

                return `
                    <div class="gym-list-item" onclick="App.focusGym('${gym.id}')">
                        <h4>${gym.name}</h4>
                        <p><i class="fas fa-map-marker-alt" style="margin-right:5px;"></i>${gym.district}</p>
                        <div class="tag-container" style="margin-top:10px;">${typeTags}</div>
                    </div>
                `;
            }).join('');
        }
    };

    // 5. App Core
    async function init() {
        const fallback = [25.0478, 121.5170]; // Taipei Station
        
        const getLocation = () => new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(fallback);
            navigator.geolocation.getCurrentPosition(
                (p) => resolve([p.coords.latitude, p.coords.longitude]),
                () => resolve(fallback),
                { timeout: 5000 }
            );
        });

        const startCoord = await getLocation();
        
        mapInstance = L.map('map', { zoomControl: false }).setView(startCoord, 14);
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
        
        LayerManager.init();
        NavigationManager.init();
        NavigationManager.updateUserMarker(startCoord[0], startCoord[1]);

        const districtData = await DataFetcher.fetchDistricts();
        if (districtData) {
            spotlightLayer = L.geoJSON(districtData, { 
                style: (f) => App.getSpotlightStyle(f), 
                className: 'spotlight-mask' 
            }).addTo(mapInstance);
        }

        markerClusterGroup = L.markerClusterGroup({ 
            disableClusteringAtZoom: 15,
            showCoverageOnHover: false
        }).addTo(mapInstance);

        allGyms = await DataFetcher.fetchGyms();
        currentGyms = [...allGyms];
        
        SidebarManager.renderList(allGyms);
        App.updateMarkers(allGyms);

        // Global Listeners
        document.getElementById('search-input').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const selectedTypes = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);

            currentGyms = allGyms.filter(gym => {
                const matchSearch = gym.district.toLowerCase().includes(val) || gym.name.toLowerCase().includes(val);
                const gymTypes = Array.isArray(gym.type) ? gym.type : [gym.type];
                const matchType = selectedTypes.length === 0 ? false : selectedTypes.some(st => gymTypes.some(gt => gt.includes(st)));
                return matchSearch && matchType;
            });

            App.updateMarkers(currentGyms);
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
            });
        });

        console.log("TAIPEI CLIMBING MAP - JAPANESE MINIMALIST VERSION READY.");
    }

    return { 
        init,
        startNavigation: (id, lat, lng, dist) => NavigationManager.calculateRoute(id, lat, lng, dist),
        updateMarkers: (gyms) => {
            markerClusterGroup.clearLayers();
            gyms.forEach(gym => {
                const marker = L.marker([gym.location.lat, gym.location.lng]);
                marker.bindPopup(InfoWindow.render(gym), { className: 'custom-popup', offset: [0, -32], maxWidth: 300 });
                marker.on('click', () => { currentOpenedMarker = marker; });
                marker.on('popupclose', () => { if (!activeDistrict) NavigationManager.clear(); currentOpenedMarker = null; });
                markerClusterGroup.addLayer(marker);
            });
        },
        focusGym: (id) => {
            const gym = allGyms.find(g => g.id === id);
            if (gym) {
                mapInstance.setView([gym.location.lat, gym.location.lng], 15);
                const layers = markerClusterGroup.getLayers();
                const m = layers.find(l => l.getLatLng().lat === gym.location.lat);
                if (m) m.openPopup();
            }
        },
        getSpotlightStyle: (feature) => {
            const props = feature.properties;
            const townName = (props.TOWN || props.TNAME || "").replace(/\s/g, "");
            const isTarget = activeDistrict && townName.includes(activeDistrict);
            return {
                fillColor: isTarget ? 'transparent' : '#000',
                fillOpacity: activeDistrict ? (isTarget ? 0 : 0.45) : 0,
                color: isTarget ? 'var(--accent-bouldering)' : 'transparent',
                weight: isTarget ? 3 : 0
            };
        },
        updateSpotlight: (districtName) => {
            activeDistrict = districtName;
            if (spotlightLayer) spotlightLayer.setStyle((f) => App.getSpotlightStyle(f));
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
