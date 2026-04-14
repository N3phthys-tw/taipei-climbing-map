/**
 * Taipei Climbing Gym Map Application - Super Robust Version
 */

const App = (() => {
    // 1. Data Fetching
    const DataFetcher = {
        async fetchGyms() {
            console.log("Fetching gyms data...");
            try {
                const response = await fetch('climbing-gyms.json');
                if (!response.ok) throw new Error('Gyms JSON not found');
                const data = await response.json();
                console.log("Gyms data loaded:", data.length, "items");
                return data;
            } catch (error) {
                console.error('Error fetching gyms:', error);
                return [];
            }
        },
        async fetchTaipeiGeoJSON() {
            console.log("Fetching GeoJSON data...");
            try {
                const response = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/taipei.json');
                if (!response.ok) throw new Error('GeoJSON source not found');
                const data = await response.json();
                console.log("GeoJSON data loaded");
                return data;
            } catch (error) {
                console.warn('GeoJSON load failed, highlighting disabled:', error.message);
                return null;
            }
        }
    };

    // 2. Map Components
    const MapUI = {
        map: null,
        districtLayer: null,
        
        init() {
            console.log("Initializing Leaflet map...");
            this.map = L.map('map', {
                maxBounds: [[24.85, 121.30], [25.30, 121.80]],
                minZoom: 11
            }).setView([25.045, 121.53], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);
            
            return this.map;
        },

        getDistrictStyle(isHighlight) {
            return {
                fillColor: isHighlight ? '#e74c3c' : '#34495e',
                weight: isHighlight ? 3 : 1,
                opacity: 0.8,
                color: isHighlight ? '#c0392b' : '#bdc3c7',
                fillOpacity: isHighlight ? 0.4 : 0.05
            };
        },

        async loadDistricts() {
            const geoData = await DataFetcher.fetchTaipeiGeoJSON();
            if (!geoData) return;

            const self = this;
            this.districtLayer = L.geoJSON(geoData, {
                style: function(feature) {
                    return self.getDistrictStyle(false);
                },
                onEachFeature: function(feature, layer) {
                    const name = feature.properties.T_Name || feature.properties.T_NAME || feature.properties.townname || "未知區域";
                    layer.bindTooltip(name, { sticky: true, direction: 'top' });
                }
            }).addTo(this.map);
        },

        highlightDistrict(districtName) {
            if (!this.districtLayer) return;
            console.log("Highlighting district:", districtName);
            
            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                const name = props.T_Name || props.T_NAME || props.townname;
                
                if (name === districtName) {
                    layer.setStyle(this.getDistrictStyle(true));
                    layer.bringToBack();
                } else {
                    layer.setStyle(this.getDistrictStyle(false));
                }
            });
        },

        resetHighlight() {
            if (this.districtLayer) {
                this.districtLayer.setStyle(this.getDistrictStyle(false));
            }
        }
    };

    // 3. Markers
    const MarkerLogic = {
        renderMarkers(map, gyms) {
            if (!gyms || gyms.length === 0) {
                console.error("No gyms to render!");
                return;
            }

            gyms.forEach(gym => {
                const marker = L.marker([gym.location.lat, gym.location.lng]).addTo(map);
                
                const types = gym.type.map(t => {
                    const cls = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                    return `<span class="${cls}">${t}</span>`;
                }).join('');

                const popupContent = `
                    <div class="gym-info-window">
                        <h3>${gym.name}</h3>
                        <p><strong>🏢 行政區:</strong> ${gym.district}</p>
                        <p><strong>📍 地址:</strong> ${gym.address}</p>
                        <p><strong>📞 電話:</strong> ${gym.phone}</p>
                        <p><strong>🧗 類型:</strong> ${types}</p>
                        <a href="${gym.website}" target="_blank">造訪官網 &rarr;</a>
                    </div>
                `;
                
                marker.bindPopup(popupContent, { className: 'custom-popup' });

                marker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    map.panTo(e.latlng);
                    MapUI.highlightDistrict(gym.district);
                });
            });

            map.on('click', () => MapUI.resetHighlight());
        }
    };

    // 4. Main Init
    async function init() {
        try {
            const map = MapUI.init();
            
            // 優先載入場館，確保地圖有用
            const gyms = await DataFetcher.fetchGyms();
            MarkerLogic.renderMarkers(map, gyms);
            
            // 延後載入行政區，不影響核心功能
            MapUI.loadDistricts();
            
        } catch (err) {
            console.error("Application initialization failed:", err);
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
