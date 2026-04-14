/**
 * Taipei Climbing Gym Map Application - Fixed Version
 */

const App = (() => {
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('climbing-gyms.json');
                if (!response.ok) throw new Error('Gyms JSON load failed');
                return await response.json();
            } catch (error) {
                console.error('Error fetching gyms:', error);
                return [];
            }
        },
        async fetchTaipeiGeoJSON() {
            try {
                // 嘗試獲取台北市行政區 GeoJSON
                const response = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/taipei.json');
                if (!response.ok) throw new Error('GeoJSON load failed');
                return await response.json();
            } catch (error) {
                console.warn('Could not load GeoJSON, highlighting will be disabled.', error);
                return null;
            }
        }
    };

    const InfoWindow = {
        render(gym) {
            const types = gym.type.map(t => {
                const className = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                return `<span class="${className}">${t}</span>`;
            }).join('');

            return `
                <div class="gym-info-window">
                    <h3>${gym.name}</h3>
                    <p><span class="label">🏢 行政區:</span> ${gym.district}</p>
                    <p><span class="label">📍 地址:</span> ${gym.address}</p>
                    <p><span class="label">📞 電話:</span> ${gym.phone}</p>
                    <p><span class="label">🧗 類型:</span> ${types}</p>
                    <a href="${gym.website}" target="_blank">造訪官網 &rarr;</a>
                </div>
            `;
        }
    };

    const MapContainer = {
        map: null,
        districtLayer: null,
        init() {
            // 1. 初始化地圖
            this.map = L.map('map', {
                maxBounds: [[24.90, 121.35], [25.25, 121.75]],
                minZoom: 11
            }).setView([25.045, 121.53], 12);

            // 2. 設定底圖 (CartoDB Light)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.map);

            return this.map;
        },
        async addDistrictLayer() {
            const geoData = await DataFetcher.fetchTaipeiGeoJSON();
            if (!geoData) return;

            // 存儲行政區名稱欄位 (解決 T_Name vs T_NAME 的問題)
            this.districtLayer = L.geoJSON(geoData, {
                style: (feature) => this.getStyle(false),
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.T_Name || feature.properties.T_NAME || feature.properties.townname;
                    layer.bindTooltip(name, { sticky: true });
                }
            }).addTo(this.map);
        },
        getStyle(isHighlight) {
            return {
                fillColor: isHighlight ? '#e74c3c' : '#34495e',
                weight: isHighlight ? 3 : 2,
                opacity: 1,
                color: isHighlight ? '#c0392b' : 'white',
                fillOpacity: isHighlight ? 0.4 : 0.1
            };
        },
        highlightDistrict(districtName) {
            if (!this.districtLayer) return;

            this.districtLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                const name = props.T_Name || props.T_NAME || props.townname;
                
                if (name === districtName) {
                    layer.setStyle(this.getStyle(true));
                    layer.bringToBack();
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

    const MarkerManager = {
        createMarkers(map, gyms) {
            gyms.forEach(gym => {
                const marker = L.marker([gym.location.lat, gym.location.lng]).addTo(map);
                
                marker.bindPopup(InfoWindow.render(gym), {
                    className: 'custom-popup'
                });

                marker.on('click', (e) => {
                    // 先停止冒泡防止地圖點擊事件觸發
                    L.DomEvent.stopPropagation(e);
                    map.panTo(e.latlng);
                    MapContainer.highlightDistrict(gym.district);
                });
            });

            // 點擊地圖背景重置
            map.on('click', () => {
                MapContainer.resetHighlight();
            });
        }
    };

    async function init() {
        const map = MapContainer.init();
        // 確保圖層載入不會卡住標記渲染
        try {
            await MapContainer.addDistrictLayer();
        } catch(e) { console.error(e); }
        
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.createMarkers(map, gyms);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
