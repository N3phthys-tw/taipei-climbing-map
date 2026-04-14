/**
 * Taipei Climbing Gym Map - Universal Version
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            console.log("--- 1. 開始載入場館資料 ---");
            try {
                const response = await fetch('climbing-gyms.json?v=' + Date.now());
                const data = await response.json();
                console.log("場館資料載入成功，共", data.length, "間");
                return data;
            } catch (e) {
                console.error("場館資料載入失敗:", e);
                return [];
            }
        },
        async fetchTaipeiGeoJSON() {
            console.log("--- 2. 開始載入行政區圖資 ---");
            try {
                // 使用另一個備用來源確保穩定
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                if (!response.ok) throw new Error("GeoJSON 404");
                const data = await response.json();
                console.log("行政區圖資載入成功");
                return data;
            } catch (e) {
                console.warn("行政區圖資載入失敗，高亮功能將停用", e);
                return null;
            }
        }
    };

    const MapUI = {
        map: null,
        districtLayer: null,
        
        init() {
            console.log("--- 3. 初始化地圖 ---");
            this.map = L.map('map', {
                maxBounds: [[24.90, 121.30], [25.25, 121.75]],
                minZoom: 11
            }).setView([25.045, 121.53], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);
            
            return this.map;
        },

        highlight(districtName) {
            if (!this.districtLayer) return;
            const target = (districtName || "").replace(/臺/g, "台").trim();
            console.log("正在搜尋行政區:", target);

            this.districtLayer.eachLayer(layer => {
                const p = layer.feature.properties;
                const geoName = (p.TOWNNAME || p.T_Name || "").replace(/臺/g, "台").trim();
                
                if (geoName === target) {
                    layer.setStyle({
                        fillColor: '#e74c3c',
                        fillOpacity: 0.4,
                        weight: 2,
                        color: '#c0392b'
                    });
                    layer.bringToFront();
                } else {
                    layer.setStyle({
                        fillColor: '#34495e',
                        fillOpacity: 0.05,
                        weight: 1,
                        color: '#bdc3c7'
                    });
                }
            });
        }
    };

    const MarkerManager = {
        render(map, gyms) {
            gyms.forEach(gym => {
                // 自動偵測座標格式 (支援 location.lat 或直接 lat)
                const lat = gym.lat || (gym.location && gym.location.lat);
                const lng = gym.lng || (gym.location && gym.location.lng);

                if (!lat || !lng) {
                    console.warn("場館座標缺失:", gym.name);
                    return;
                }

                const marker = L.marker([lat, lng]).addTo(map);
                
                const types = (Array.isArray(gym.type) ? gym.type : [gym.type]).map(t => {
                    const cls = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                    return `<span class="${cls}">${t}</span>`;
                }).join('');

                const content = `
                    <div class="gym-info-window">
                        <h3>${gym.name}</h3>
                        <p><strong>🏢 行政區:</strong> ${gym.district || "未知"}</p>
                        <p><strong>📍 地址:</strong> ${gym.address || gym.addr}</p>
                        <p><strong>📞 電話:</strong> ${gym.phone || gym.tel}</p>
                        <p><strong>🧗 類型:</strong> ${types}</p>
                        <a href="${gym.website || '#'}" target="_blank">造訪官網 &rarr;</a>
                    </div>
                `;
                
                marker.bindPopup(content, { className: 'custom-popup' });

                marker.on('click', () => {
                    console.log("點擊場館:", gym.name, "行政區:", gym.district);
                    MapUI.highlight(gym.district);
                });
            });
        }
    };

    async function init() {
        const map = MapUI.init();
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.render(map, gyms);

        const geoData = await DataFetcher.fetchTaipeiGeoJSON();
        if (geoData) {
            MapUI.districtLayer = L.geoJSON(geoData, {
                style: {
                    fillColor: '#34495e',
                    fillOpacity: 0.05,
                    weight: 1,
                    color: '#bdc3c7'
                },
                interactive: false // 確保不擋住標記點
            }).addTo(map);
            MapUI.districtLayer.bringToBack();
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
