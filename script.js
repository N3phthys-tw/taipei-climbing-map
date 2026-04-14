/**
 * Taipei Climbing Gym Map - Final Robust Version
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('climbing-gyms.json');
                return await response.json();
            } catch (error) {
                console.error('Gyms load failed:', error);
                return [];
            }
        },
        async fetchTaipeiGeoJSON() {
            try {
                // 使用更穩定的圖資來源
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                return await response.json();
            } catch (error) {
                console.warn('GeoJSON failed:', error);
                return null;
            }
        }
    };

    const MapUI = {
        map: null,
        districtLayer: null,
        
        init() {
            this.map = L.map('map', {
                maxBounds: [[24.90, 121.30], [25.25, 121.75]],
                minZoom: 11
            }).setView([25.045, 121.53], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);
            
            return this.map;
        },

        // 正規化名稱：將 臺 改為 台，確保匹配
        normalizeName(name) {
            if (!name) return "";
            return name.replace(/臺/g, "台");
        },

        getStyle(isHighlight) {
            return {
                fillColor: isHighlight ? '#e74c3c' : '#bdc3c7',
                weight: isHighlight ? 3 : 1,
                opacity: 0.5,
                color: isHighlight ? '#c0392b' : '#95a5a6',
                fillOpacity: isHighlight ? 0.3 : 0.02 // 平時幾乎透明，高亮才顯色
            };
        },

        async loadDistricts() {
            const geoData = await DataFetcher.fetchTaipeiGeoJSON();
            if (!geoData) return;

            const self = this;
            this.districtLayer = L.geoJSON(geoData, {
                style: () => self.getStyle(false),
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.TOWNNAME || feature.properties.T_Name || "";
                    layer.bindTooltip(name, { sticky: true });
                }
            }).addTo(this.map);
            
            this.districtLayer.bringToBack(); // 確保在標記點下方
        },

        highlightDistrict(districtName) {
            if (!this.districtLayer) return;
            const targetName = this.normalizeName(districtName);

            this.districtLayer.eachLayer(layer => {
                const geoName = this.normalizeName(layer.feature.properties.TOWNNAME || layer.feature.properties.T_Name);
                if (geoName === targetName) {
                    layer.setStyle(this.getStyle(true));
                } else {
                    layer.setStyle(this.getStyle(false));
                }
            });
        },

        resetHighlight() {
            if (this.districtLayer) {
                this.districtLayer.setStyle(this.getStyle(false));
            }
        }
    };

    const MarkerLogic = {
        renderMarkers(map, gyms) {
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

    async function init() {
        const map = MapUI.init();
        const gyms = await DataFetcher.fetchGyms();
        MarkerLogic.renderMarkers(map, gyms);
        MapUI.loadDistricts();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
