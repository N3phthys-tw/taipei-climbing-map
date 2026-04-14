/**
 * Taipei Climbing Gym Map - Visual & Logic Fix
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                return await response.json();
            } catch (e) {
                console.error("Gyms data failed:", e);
                return [];
            }
        },
        async fetchGeoJSON() {
            try {
                // 使用 wenlab501 的圖資
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                return await response.json();
            } catch (e) {
                console.warn("GeoJSON failed:", e);
                return null;
            }
        }
    };

    const MapUI = {
        map: null,
        districtLayer: null,
        
        init() {
            this.map = L.map('map', {
                maxBounds: [[24.9, 121.3], [25.3, 121.8]],
                minZoom: 11
            }).setView([25.045, 121.53], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);
            
            return this.map;
        },

        normalize(name) {
            return (name || "").toString().replace(/臺/g, "台").trim();
        },

        // 預設樣式：完全透明，只留淡邊框，解決「灰白」問題
        defaultStyle() {
            return {
                fillColor: '#34495e',
                fillOpacity: 0, // 改為 0，讓底圖變亮
                weight: 1,
                color: '#ced4da', // 淡灰色邊框
                opacity: 0.5
            };
        },

        highlightStyle() {
            return {
                fillColor: '#e74c3c',
                fillOpacity: 0.3,
                weight: 2,
                color: '#c0392b',
                opacity: 1
            };
        },

        highlight(districtName) {
            if (!this.districtLayer) return;
            const target = this.normalize(districtName);
            console.log("尋找行政區:", target);

            let found = false;
            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                // 暴力匹配：檢查所有屬性值
                const values = Object.values(props).map(v => this.normalize(v));
                
                if (values.includes(target)) {
                    layer.setStyle(this.highlightStyle());
                    layer.bringToFront();
                    found = true;
                } else {
                    layer.setStyle(this.defaultStyle());
                }
            });
            
            if (!found) console.warn("未找到匹配行政區:", target);
        }
    };

    const MarkerManager = {
        render(map, gyms) {
            gyms.forEach(gym => {
                const lat = gym.lat || (gym.location && gym.location.lat);
                const lng = gym.lng || (gym.location && gym.location.lng);
                if (!lat || !lng) return;

                const marker = L.marker([lat, lng]).addTo(map);
                
                const types = (Array.isArray(gym.type) ? gym.type : [gym.type])
                    .map(t => `<span class="${t.includes('抱石') ? 'tag-bouldering' : 'tag-lead'}">${t}</span>`)
                    .join('');

                marker.bindPopup(`
                    <div class="gym-info-window">
                        <h3>${gym.name}</h3>
                        <p><strong>🏢 行政區:</strong> ${gym.district}</p>
                        <p><strong>📍 地址:</strong> ${gym.address || gym.addr}</p>
                        <p><strong>📞 電話:</strong> ${gym.phone || gym.tel}</p>
                        <p><strong>🧗 類型:</strong> ${types}</p>
                        <a href="${gym.website || '#'}" target="_blank">造訪官網 &rarr;</a>
                    </div>
                `, { offset: [0, -30] });

                marker.on('click', () => {
                    MapUI.highlight(gym.district);
                });
            });

            map.on('click', (e) => {
                if (e.originalEvent.target.id === 'map' || e.originalEvent.target.classList.contains('leaflet-container')) {
                    if (MapUI.districtLayer) MapUI.districtLayer.setStyle(MapUI.defaultStyle());
                }
            });
        }
    };

    async function init() {
        const map = MapUI.init();
        
        // 1. 優先載入場館
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.render(map, gyms);

        // 2. 載入行政區圖層
        const geoData = await DataFetcher.fetchGeoJSON();
        if (geoData) {
            MapUI.districtLayer = L.geoJSON(geoData, {
                style: MapUI.defaultStyle(),
                interactive: false // 讓點擊直接穿透到標記點
            }).addTo(map);
            MapUI.districtLayer.bringToBack();
            console.log("行政區圖層已就緒");
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
