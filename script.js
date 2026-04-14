/**
 * Taipei Climbing Gym Map - Fuzzy Matching Fix
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                return await response.json();
            } catch (e) { return []; }
        },
        async fetchGeoJSON() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                return await response.json();
            } catch (e) { return null; }
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
                attribution: '&copy; OSM'
            }).addTo(this.map);
            
            return this.map;
        },

        // 提取核心名稱（如：大同區 -> 大同）
        getCoreName(name) {
            if (!name) return "";
            return name.toString().replace(/臺/g, "台").replace(/區/g, "").trim();
        },

        defaultStyle() {
            return { fillColor: '#34495e', fillOpacity: 0, weight: 1, color: '#ced4da', opacity: 0.5 };
        },

        highlightStyle() {
            return { fillColor: '#e74c3c', fillOpacity: 0.3, weight: 2, color: '#c0392b', opacity: 1 };
        },

        highlight(districtName) {
            if (!this.districtLayer) return;
            const target = this.getCoreName(districtName);
            console.log("正在尋找的核心名稱:", target);

            let found = false;
            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                // 檢查 GeoJSON 裡的所有屬性值，只要包含「大同」這兩個字就亮起
                const values = Object.values(props).map(v => this.getCoreName(v));
                
                if (values.some(v => v === target)) {
                    layer.setStyle(this.highlightStyle());
                    layer.bringToFront();
                    found = true;
                } else {
                    layer.setStyle(this.defaultStyle());
                }
            });
            
            if (!found) {
                console.warn("無法匹配:", target);
                // 偵錯用：列出目前圖層中所有的名稱
                this.districtLayer.eachLayer(layer => {
                    console.log("圖層屬性範例:", layer.feature.properties);
                });
            }
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
                if (MapUI.districtLayer) MapUI.districtLayer.setStyle(MapUI.defaultStyle());
            });
        }
    };

    async function init() {
        const map = MapUI.init();
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.render(map, gyms);

        const geoData = await DataFetcher.fetchGeoJSON();
        if (geoData) {
            MapUI.districtLayer = L.geoJSON(geoData, {
                style: MapUI.defaultStyle(),
                interactive: false
            }).addTo(map);
            MapUI.districtLayer.bringToBack();
            console.log("行政區圖層已就緒，匹配邏輯升級為核心模糊匹配");
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
