/**
 * Taipei Climbing Gym Map - Final Fix
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                const data = await response.json();
                console.log("成功載入場館:", data.length);
                return data;
            } catch (e) {
                console.error("無法載入場館資料:", e);
                return [];
            }
        },
        async fetchGeoJSON() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/wenlab501/Rt/main/TPE_town.geojson');
                return await response.json();
            } catch (e) {
                console.warn("圖資載入失敗");
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
                attribution: '&copy; OSM'
            }).addTo(this.map);
            return this.map;
        },
        // 同時支援 臺 與 台 的匹配
        normalize(name) {
            return (name || "").replace(/臺/g, "台").trim();
        },
        highlight(districtName) {
            if (!this.districtLayer) return;
            const target = this.normalize(districtName);
            
            this.districtLayer.eachLayer(layer => {
                const p = layer.feature.properties;
                const geoName = this.normalize(p.TOWNNAME || p.T_Name || "");
                
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
                const lat = gym.lat || (gym.location && gym.location.lat);
                const lng = gym.lng || (gym.location && gym.location.lng);
                if (!lat || !lng) return;

                const marker = L.marker([lat, lng]).addTo(map);
                
                // 處理多種類型
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
                `);

                marker.on('click', () => {
                    MapUI.highlight(gym.district);
                });
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
                style: { fillColor: '#34495e', fillOpacity: 0.05, weight: 1, color: '#bdc3c7' },
                interactive: false
            }).addTo(map);
            MapUI.districtLayer.bringToBack();
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
