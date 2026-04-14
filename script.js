/**
 * Taipei Climbing Gym Map - Senior Engineer & GIS Expert Version (Fixed)
 * 
 * [修復紀錄]
 * 1. 修正屬性名稱：新增支援 GeoJSON 中的 'TOWN' 欄位。
 * 2. 修正匹配邏輯：由精確匹配改為包含匹配 (.includes)，解決「台北市」前綴問題。
 */

const App = (() => {
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
            fillOpacity: 0.5,
            weight: 4,
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
                zoomControl: false
            }).setView([25.045, 121.53], 12);

            L.control.zoom({ position: 'bottomright' }).addTo(this.map);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);
            
            return this.map;
        },

        normalize(name) {
            if (!name) return "";
            return name.toString().replace(/臺/g, "台").trim();
        },

        highlightDistrict(districtName) {
            if (!this.districtLayer) {
                console.warn("District layer not yet loaded.");
                return;
            }
            const target = this.normalize(districtName);
            
            if (this.activeDistrict === target) return;
            this.activeDistrict = target;

            console.log(`[GIS] Searching for district: ${target}`);
            let targetBounds = null;
            let matchCount = 0;

            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                // 擴充支援欄位：TOWN, TOWNNAME, T_Name
                const geoName = this.normalize(props.TOWN || props.TOWNNAME || props.T_Name || "");
                
                // 核心修復：使用 includes 進行模糊匹配
                if (geoName !== "" && (geoName.includes(target) || target.includes(geoName))) {
                    layer.setStyle(STYLES.HIGHLIGHT);
                    layer.bringToFront();
                    targetBounds = layer.getBounds();
                    matchCount++;
                } else {
                    layer.setStyle(STYLES.DEFAULT);
                }
            });

            if (targetBounds) {
                console.log(`[GIS] Found ${matchCount} match(es). Fitting bounds...`);
                this.map.fitBounds(targetBounds, {
                    padding: [50, 50],
                    maxZoom: 14,
                    animate: true,
                    duration: 0.5
                });
            } else {
                console.warn(`[GIS] No match found for: ${target}`);
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

                marker.on('click', (e) => {
                    MapUI.highlightDistrict(gym.district);
                    map.panTo(e.latlng);
                });
            });

            map.on('click', (e) => {
                if (e.originalEvent.target.id === 'map' || e.originalEvent.target.classList.contains('leaflet-container')) {
                    MapUI.reset();
                }
            });
        }
    };

    async function init() {
        const map = MapUI.init();
        
        const [gyms, geoData] = await Promise.all([
            DataFetcher.fetchGyms(),
            DataFetcher.fetchGeoJSON()
        ]);

        if (geoData) {
            MapUI.districtLayer = L.geoJSON(geoData, {
                style: STYLES.DEFAULT,
                interactive: false
            }).addTo(map);
            MapUI.districtLayer.bringToBack();
            console.log("[GIS] District layer ready.");
        }

        MarkerLogic.render(map, gyms);
        console.log("台北市攀岩地圖系統已就緒 - 修正版");
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
