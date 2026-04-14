/**
 * Taipei Climbing Gym Map - Production Version
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
                // 使用 wenlab501 的 TPE_town.geojson
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                if (!response.ok) throw new Error('GeoJSON fetch error');
                const data = await response.json();
                console.log("GeoJSON loaded, found features:", data.features.length);
                return data;
            } catch (error) {
                console.error('GeoJSON failed:', error);
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

        normalizeName(name) {
            if (!name) return "";
            return name.replace(/臺/g, "台").trim();
        },

        getStyle(isHighlight) {
            return {
                fillColor: isHighlight ? '#e74c3c' : '#bdc3c7',
                weight: isHighlight ? 3 : 1,
                opacity: 0.8,
                color: isHighlight ? '#c0392b' : '#ecf0f1',
                fillOpacity: isHighlight ? 0.4 : 0.05
            };
        },

        async loadDistricts() {
            const geoData = await DataFetcher.fetchTaipeiGeoJSON();
            if (!geoData) return;

            const self = this;
            this.districtLayer = L.geoJSON(geoData, {
                style: () => self.getStyle(false),
                onEachFeature: (feature, layer) => {
                    // 根據實測，該圖資使用 T_Name 欄位
                    const name = feature.properties.T_Name || feature.properties.TOWNNAME || "";
                    layer.bindTooltip(name, { sticky: true, direction: 'top' });
                }
            }).addTo(this.map);
            
            this.districtLayer.bringToBack();
            console.log("Districts layer added to map");
        },

        highlightDistrict(districtName) {
            if (!this.districtLayer) {
                console.warn("District layer not ready yet");
                return;
            }
            const targetName = this.normalizeName(districtName);
            console.log("Attempting to highlight:", targetName);

            let found = false;
            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                const geoName = this.normalizeName(props.T_Name || props.TOWNNAME || "");
                
                if (geoName === targetName) {
                    layer.setStyle(this.getStyle(true));
                    layer.bringToFront(); // 高亮的行政區移到最前以確保顯色
                    found = true;
                } else {
                    layer.setStyle(this.getStyle(false));
                }
            });

            if (!found) console.warn("No match found for district:", districtName);
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
                
                marker.bindPopup(popupContent, { className: 'custom-popup', offset: [0, -32] });

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
        // 先顯示標記後再加載行政區
        setTimeout(() => MapUI.loadDistricts(), 500);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
