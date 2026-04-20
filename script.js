/**
 * Taipei Climbing Map - Logic & Filter Repair Version
 * Fixes: Close Button Functionality, Gym Type Filtering Logic
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

    // 0. UI Managers
    const LayerManager = {
        init() {
            baseLayers = {
                standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }),
                dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' }),
                satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' })
            };
            const savedStyle = localStorage.getItem('map_style') || 'standard';
            this.switchLayer(savedStyle);
            document.getElementById('style-btn').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('style-menu').classList.toggle('hidden'); });
            document.querySelectorAll('.style-option').forEach(opt => { opt.addEventListener('click', () => this.switchLayer(opt.dataset.style)); });
            document.addEventListener('click', () => document.getElementById('style-menu').classList.add('hidden'));
        },
        switchLayer(style) {
            if (currentBaseLayer) mapInstance.removeLayer(currentBaseLayer);
            currentBaseLayer = baseLayers[style];
            currentBaseLayer.addTo(mapInstance);
            localStorage.setItem('map_style', style);
            document.querySelectorAll('.style-option').forEach(opt => opt.classList.toggle('active', opt.dataset.style === style));
        }
    };

    // 1. Data Processing Logic
    const DataFetcher = {
        async fetchAll() {
            const [gyms, districts] = await Promise.all([
                fetch('./climbing-gyms.json?v=' + Date.now()).then(r => r.json()),
                fetch('./taipei-districts.json').then(r => r.json())
            ]);
            return { gyms, districts };
        }
    };

    // 2. Filter Logic (REPAIRED)
    const FilterManager = {
        getFilteredGyms() {
            const searchText = document.getElementById('search-input').value.toLowerCase();
            const selectedTypes = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);

            return allGyms.filter(gym => {
                const matchSearch = gym.district.toLowerCase().includes(searchText) || gym.name.toLowerCase().includes(searchText);
                const gymTypes = Array.isArray(gym.type) ? gym.type : [gym.type];
                
                // Fix: Check if any selected type exists in the gym's type list
                const matchType = selectedTypes.length === 0 ? false : 
                                 selectedTypes.some(st => gymTypes.some(gt => gt.includes(st)));
                
                return matchSearch && matchType;
            });
        },
        updateUI() {
            currentGyms = this.getFilteredGyms();
            App.renderMarkers(currentGyms);
            App.renderSidebar(currentGyms);
        }
    };

    // 3. App Core
    const DEFAULT_COORD = [25.040456, 121.503585];

    async function init() {
        mapInstance = L.map('map', { zoomControl: false }).setView(DEFAULT_COORD, 14);
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

        const data = await DataFetcher.fetchAll();
        allGyms = data.gyms;
        
        LayerManager.init();
        NavigationManager.init();
        
        // Initial state: Default location with black marker
        App.updateUserMarker(DEFAULT_COORD[0], DEFAULT_COORD[1], true);

        spotlightLayer = L.geoJSON(data.districts, { style: (f) => App.getSpotlightStyle(f), className: 'spotlight-mask' }).addTo(mapInstance);
        markerClusterGroup = L.markerClusterGroup({ disableClusteringAtZoom: 15 }).addTo(mapInstance);

        // Event Listeners
        document.getElementById('search-input').addEventListener('input', () => FilterManager.updateUI());
        document.querySelectorAll('.type-filter').forEach(cb => cb.addEventListener('change', () => FilterManager.updateUI()));
        document.getElementById('nav-close').addEventListener('click', () => NavigationManager.reset());

        document.getElementById('geo-btn').addEventListener('click', () => {
            navigator.geolocation.getCurrentPosition(p => {
                const coord = [p.coords.latitude, p.coords.longitude];
                App.updateUserMarker(coord[0], coord[1], false);
                mapInstance.setView(coord, 15);
            }, () => alert("無法取得您的位置"));
        });

        FilterManager.updateUI(); // Initial Run
    }

    const NavigationManager = {
        init() { /* Reset already bound in init() above */ },
        reset() {
            if (routingControl) { mapInstance.removeControl(routingControl); routingControl = null; }
            document.getElementById('nav-summary').classList.add('hidden');
            App.updateSpotlight(null);
            
            // Reset to default location after closing navigation
            App.updateUserMarker(DEFAULT_COORD[0], DEFAULT_COORD[1], true);
            if (userLocation) mapInstance.panTo(userLocation);
        },
        startNavigation(id, lat, lng, dist) {
            if (!userLocation) return alert("請先定位。");
            this.reset_internal(); // Internal reset to avoid marker flickering
            App.updateSpotlight(dist);
            routingControl = L.Routing.control({
                waypoints: [L.latLng(userLocation), L.latLng(lat, lng)],
                show: false, addWaypoints: false, fitSelectedRoutes: true,
                lineOptions: { styles: [{ color: '#4285F4', opacity: 0.8, weight: 6 }] },
                createMarker: () => null
            }).addTo(mapInstance);

            routingControl.on('routesfound', (e) => {
                const s = e.routes[0].summary;
                const d = (s.totalDistance/1000).toFixed(1);
                document.getElementById('nav-summary').classList.remove('hidden');
                document.getElementById('nav-time').textContent = `${d} KM`;
                document.getElementById('nav-dist').textContent = ''; // Clear residual "--"
                mapInstance.fitBounds(L.latLngBounds(e.routes[0].coordinates), { padding: [100, 100] });
            });
        },
        reset_internal() {
            if (routingControl) { mapInstance.removeControl(routingControl); routingControl = null; }
            document.getElementById('nav-summary').classList.add('hidden');
        }
    };

    return {
        init,
        startNavigation: (id, lat, lng, dist) => NavigationManager.startNavigation(id, lat, lng, dist),
        renderMarkers: (gyms) => {
            markerClusterGroup.clearLayers();
            gyms.forEach(gym => {
                const marker = L.marker([gym.location.lat, gym.location.lng]);
                marker.bindPopup(App.renderInfo(gym), { className: 'custom-popup', offset: [0, -32], maxWidth: 300 });
                marker.on('click', () => { currentOpenedMarker = marker; });
                markerClusterGroup.addLayer(marker);
            });
        },
        renderSidebar: (gyms) => {
            const container = document.getElementById('gym-list');
            if (gyms.length === 0) { container.innerHTML = '<div style="padding:40px; text-align:center; color:#BBB;">請調整篩選條件</div>'; return; }
            container.innerHTML = gyms.map(gym => `
                <div class="gym-list-item" onclick="App.focusGym('${gym.id}')">
                    <h4>${gym.name}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${gym.district}</p>
                    <div class="tag-container">${(Array.isArray(gym.type) ? gym.type : [gym.type]).map(t => `<span class="${t.includes('抱石') ? 'tag-bouldering' : 'tag-lead'}">${t}</span>`).join('')}</div>
                </div>
            `).join('');
        },
        renderInfo: (gym) => {
            const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
            const tags = typeList.map(t => `<span class="${t.includes('抱石') ? 'tag-bouldering' : 'tag-lead'}">${t}</span>`).join('');
            
            return `
                <div class="gym-detail-card">
                    <div class="info-accent-bar"></div>
                    <div class="gym-detail-header">
                        <h3 style="margin:0; font-size:1.1rem; color:var(--jp-text-main);">${gym.name}</h3>
                        <div class="tag-container">${tags}</div>
                    </div>
                    <div class="gym-detail-body">
                        <div class="detail-info-row">
                            <i class="fas fa-map-marker-alt" style="color:var(--jp-blue);"></i>
                            <span>${gym.address || gym.addr}</span>
                        </div>
                        <div class="detail-info-row">
                            <i class="fas fa-phone-alt" style="color:var(--jp-blue);"></i>
                            <span>${gym.phone || '暫無電話資訊'}</span>
                        </div>
                        <div class="detail-info-row">
                            <i class="fas fa-clock" style="color:var(--jp-blue);"></i>
                            <span>${gym.operatingHours || '請洽場館查詢'}</span>
                        </div>
                        ${gym.fees ? `
                        <div class="detail-info-row">
                            <i class="fas fa-ticket-alt" style="color:var(--jp-blue);"></i>
                            <span>${gym.fees}</span>
                        </div>` : ''}
                        
                        <button class="btn-primary" style="margin-top:10px;" onclick="App.startNavigation('${gym.id}', ${gym.location.lat}, ${gym.location.lng}, '${gym.district}')">
                            <i class="fas fa-location-arrow"></i> 規劃路徑
                        </button>
                    </div>
                </div>
            `;
        },
        focusGym: (id) => {
            const gym = allGyms.find(g => g.id === id);
            if (gym) {
                mapInstance.setView([gym.location.lat, gym.location.lng], 15);
                const marker = markerClusterGroup.getLayers().find(l => l.getLatLng().lat === gym.location.lat);
                if (marker) marker.openPopup();
            }
        },
        updateUserMarker: (lat, lng, isDefault = false) => {
            userLocation = [lat, lng];
            if (userMarker) mapInstance.removeLayer(userMarker);
            const color = isDefault ? '#000000' : '#e74c3c';
            userMarker = L.circleMarker([lat, lng], { 
                radius: 8, 
                fillColor: color, 
                color: '#FFF', 
                weight: 2, 
                fillOpacity: 0.8 
            }).addTo(mapInstance);
            if (isDefault) {
                userMarker.bindTooltip("預設地點", { permanent: true, direction: 'top', offset: [0, -10] }).openTooltip();
            }
        },
        getSpotlightStyle: (f) => {
            const town = (f.properties.TOWN || f.properties.TNAME || "").replace(/\s/g, "");
            const isTarget = activeDistrict && town.includes(activeDistrict);
            return { fillColor: isTarget ? 'transparent' : '#000', fillOpacity: activeDistrict ? (isTarget ? 0 : 0.45) : 0, color: isTarget ? '#A2B5BB' : 'transparent', weight: 3 };
        },
        updateSpotlight: (d) => { activeDistrict = d; if (spotlightLayer) spotlightLayer.setStyle((f) => App.getSpotlightStyle(f)); }
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
