/**
 * Taipei Climbing Gym Map Application
 */

const App = (() => {
    // 1. DataFetcher Module
    const DataFetcher = {
        async fetchGyms() {
            try {
                const response = await fetch('climbing-gyms.json');
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            } catch (error) {
                console.error('Fetching gyms failed:', error);
                return [];
            }
        },
        async fetchTaipeiGeoJSON() {
            try {
                // 使用公共 API 獲取台北市行政區 GeoJSON (簡化版)
                const response = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/taipei.json');
                if (!response.ok) throw new Error('GeoJSON load failed');
                return await response.json();
            } catch (error) {
                console.error('Fetching GeoJSON failed:', error);
                return null;
            }
        }
    };

    // 2. InfoWindow Module
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

    // 3. MapContainer Module
    const MapContainer = {
        map: null,
        districtLayer: null,
        init() {
            // Initialize map centered at Taipei City
            this.map = L.map('map', {
                maxBounds: [[24.95, 121.40], [25.25, 121.75]], // 限制地圖範圍在台北周邊
                minZoom: 11
            }).setView([25.045, 121.53], 12);

            // Add dark mode tile layer for better highlight contrast
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(this.map);

            return this.map;
        },
        async addDistrictLayer() {
            const geoData = await DataFetcher.fetchTaipeiGeoJSON();
            if (!geoData) return;

            this.districtLayer = L.geoJSON(geoData, {
                style: this.getDefaultStyle,
                onEachFeature: (feature, layer) => {
                    layer.bindTooltip(feature.properties.T_Name, { sticky: true });
                }
            }).addTo(this.map);
        },
        getDefaultStyle(feature) {
            return {
                fillColor: '#34495e',
                weight: 2,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.1 // 預設變暗/透明
            };
        },
        highlightDistrict(districtName) {
            if (!this.districtLayer) return;

            this.districtLayer.eachLayer(layer => {
                const name = layer.feature.properties.T_Name; // 根據 g0v 圖資的屬性名稱
                if (name === districtName) {
                    layer.setStyle({
                        fillColor: '#e74c3c',
                        fillOpacity: 0.4,
                        weight: 3,
                        color: '#c0392b'
                    });
                    layer.bringToBack();
                } else {
                    layer.setStyle(this.getDefaultStyle());
                }
            });
        },
        resetHighlight() {
            if (this.districtLayer) {
                this.districtLayer.setStyle(this.getDefaultStyle());
            }
        }
    };

    // 4. MarkerManager Module
    const MarkerManager = {
        createMarkers(map, gyms) {
            gyms.forEach(gym => {
                const marker = L.marker([gym.location.lat, gym.location.lng]).addTo(map);
                
                marker.bindPopup(InfoWindow.render(gym), {
                    className: 'custom-popup'
                });

                marker.on('click', (e) => {
                    map.panTo(e.latlng);
                    MapContainer.highlightDistrict(gym.district);
                });
            });

            // 點擊地圖空白處重置高亮
            map.on('click', (e) => {
                if (e.originalEvent.target.id === 'map') {
                    MapContainer.resetHighlight();
                }
            });
        }
    };

    // Initialization Logic
    async function init() {
        const map = MapContainer.init();
        await MapContainer.addDistrictLayer();
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.createMarkers(map, gyms);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
