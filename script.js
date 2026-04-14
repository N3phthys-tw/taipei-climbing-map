/**
 * Taipei Climbing Gym Map - Senior Engineer & GIS Expert Version
 * 
 * [技術標準]
 * 1. 互動反應時間 < 100ms
 * 2. 行政區高亮排他性 (Exclusivity)
 * 3. 自動邊界縮放 (fitBounds)
 */

const App = (() => {
    // [常量定義] 符合資深工程師的可維護性標準
    const STYLES = {
        DEFAULT: {
            fillColor: '#34495e',
            fillOpacity: 0.02,
            weight: 1,
            color: '#ced4da',
            opacity: 0.5
        },
        HIGHLIGHT: {
            fillColor: '#e74c3c',
            fillOpacity: 0.5, // 規格要求：填充透明度 0.5
            weight: 4,       // 規格要求：框線加粗
            color: '#c0392b',
            opacity: 1
        }
    };

    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                return await response.json();
            } catch (e) {
                console.error("Gym Data Load Error:", e);
                return [];
            }
        },
        async fetchGeoJSON() {
            try {
                // 使用 GIS 專家推薦的穩定台北行政區圖資
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                return await response.json();
            } catch (e) {
                console.error("GeoJSON Load Error:", e);
                return null;
            }
        }
    };

    const MapUI = {
        map: null,
        districtLayer: null,
        activeDistrict: null,
        
        init() {
            this.map = L.map('map', {
                maxBounds: [[24.9, 121.3], [25.3, 121.8]],
                minZoom: 11,
                zoomControl: false // 為了視覺簡潔，可自定義縮放按鈕
            }).setView([25.045, 121.53], 12);

            L.control.zoom({ position: 'bottomright' }).addTo(this.map);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);
            
            return this.map;
        },

        normalize(name) {
            return (name || "").toString().replace(/臺/g, "台").trim();
        },

        /**
         * 核心高亮邏輯：執行效能優化版
         */
        highlightDistrict(districtName) {
            if (!this.districtLayer) return;
            const target = this.normalize(districtName);
            
            // 若重複點選同一區則不重複執行，節省效能
            if (this.activeDistrict === target) return;
            this.activeDistrict = target;

            let targetBounds = null;

            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                // 掃描 TOWNNAME 與 T_Name 確保 100% 匹配
                const geoName = this.normalize(props.TOWNNAME || props.T_Name);
                
                if (geoName === target) {
                    layer.setStyle(STYLES.HIGHLIGHT);
                    layer.bringToFront();
                    targetBounds = layer.getBounds(); // 獲取邊界用於 fitBounds
                } else {
                    layer.setStyle(STYLES.DEFAULT);
                }
            });

            // 優化建議：自動縮放至適合視野
            if (targetBounds) {
                this.map.fitBounds(targetBounds, {
                    padding: [50, 50],
                    maxZoom: 14,
                    animate: true,
                    duration: 0.5
                });
            }
        },

        reset() {
            this.activeDistrict = null;
            if (this.districtLayer) {
                this.districtLayer.setStyle(STYLES.DEFAULT);
            }
        }
    };

    const MarkerLogic = {
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
                `, { offset: [0, -30], closeButton: false });

                // [事件監聽] 連結 Marker 與 行政區圖層
                marker.on('click', (e) => {
                    // 1. 觸發行政區高亮與縮放
                    MapUI.highlightDistrict(gym.district);
                    // 2. 平滑移動至點位
                    map.panTo(e.latlng);
                });
            });

            // 點擊地圖背景重置狀態
            map.on('click', (e) => {
                if (e.originalEvent.target.id === 'map' || e.originalEvent.target.classList.contains('leaflet-container')) {
                    MapUI.reset();
                }
            });
        }
    };

    async function init() {
        const map = MapUI.init();
        
        // [數據準備] 並行載入以提升啟動速度
        const [gyms, geoData] = await Promise.all([
            DataFetcher.fetchGyms(),
            DataFetcher.fetchGeoJSON()
        ]);

        // 渲染行政區圖層 (Z-index 置底處理)
        if (geoData) {
            MapUI.districtLayer = L.geoJSON(geoData, {
                style: STYLES.DEFAULT,
                interactive: false // 核心異常處理：禁止阻擋 Marker 點擊
            }).addTo(map);
            MapUI.districtLayer.bringToBack();
        }

        // 渲染標記點
        MarkerLogic.render(map, gyms);
        
        console.log("台北市攀岩地圖系統已就緒 - 資深全端架構師版本");
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
