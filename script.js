/**
 * Taipei Climbing Gym Map - Ultimate Debug Version
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('climbing-gyms.json');
                return await response.json();
            } catch (error) {
                console.error('Gyms Load Error:', error);
                return [];
            }
        },
        async fetchTaipeiGeoJSON() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                if (!response.ok) throw new Error('GeoJSON 404');
                return await response.json();
            } catch (error) {
                console.error('GeoJSON Load Error:', error);
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

        normalize(name) {
            if (!name) return "";
            return name.toString().replace(/臺/g, "台").trim();
        },

        getStyle(isHighlight) {
            return {
                fillColor: isHighlight ? '#e74c3c' : '#34495e',
                weight: isHighlight ? 3 : 1,
                opacity: 0.6,
                color: isHighlight ? '#c0392b' : '#bdc3c7',
                fillOpacity: isHighlight ? 0.4 : 0.05
            };
        },

        async loadDistricts() {
            const geoData = await DataFetcher.fetchTaipeiGeoJSON();
            if (!geoData) return;

            console.log("GeoJSON loaded successfully");

            this.districtLayer = L.geoJSON(geoData, {
                style: () => this.getStyle(false),
                interactive: false // 重要：防止圖層阻擋 Marker 點擊
            }).addTo(this.map);
            
            this.districtLayer.bringToBack();

            // 提供一個手動偵錯函數
            window.debugDistricts = () => {
                this.districtLayer.eachLayer(layer => {
                    console.log("Found District in GeoJSON:", layer.feature.properties);
                });
            };
        },

        highlightDistrict(districtName) {
            if (!this.districtLayer) return;
            const target = this.normalize(districtName);
            console.log("Targeting district:", target);

            let matchCount = 0;
            this.districtLayer.eachLayer(layer => {
                const p = layer.feature.properties;
                const geoName = this.normalize(p.TOWNNAME || p.T_Name || p.townname || "");
                
                if (geoName === target) {
                    layer.setStyle(this.getStyle(true));
                    matchCount++;
                } else {
                    layer.setStyle(this.getStyle(false));
                }
            });
            console.log(`Highlighted ${matchCount} matches for ${target}`);
        },

        resetHighlight() {
            if (this.districtLayer) this.districtLayer.setStyle(this.getStyle(false));
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

                const content = `
                    <div class="gym-info-window">
                        <h3>${gym.name}</h3>
                        <p><strong>🏢 行政區:</strong> ${gym.district}</p>
                        <p><strong>📍 地址:</strong> ${gym.address}</p>
                        <p><strong>📞 電話:</strong> ${gym.phone}</p>
                        <p><strong>🧗 類型:</strong> ${types}</p>
                        <a href="${gym.website}" target="_blank">造訪官網 &rarr;</a>
                    </div>
                `;
                
                marker.bindPopup(content, { className: 'custom-popup' });

                marker.on('click', (e) => {
                    console.log("Marker clicked:", gym.name, "District:", gym.district);
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
        // 稍微延遲載入行政區，確保標記先渲染
        setTimeout(() => MapUI.loadDistricts(), 300);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
