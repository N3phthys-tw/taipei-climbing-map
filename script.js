/**
 * Taipei Climbing Gym Map - Standard Color Version
 */

const App = (() => {
    // 1. DataFetcher Module
    const DataFetcher = {
        async fetchGyms() {
            try {
                // 加入時間戳記避免快取問題
                const response = await fetch('./climbing-gyms.json?v=' + Date.now());
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            } catch (error) {
                console.error('Fetching gyms failed:', error);
                return [];
            }
        }
    };

    // 2. InfoWindow Module
    const InfoWindow = {
        render(gym) {
            const typeList = Array.isArray(gym.type) ? gym.type : [gym.type];
            const types = typeList.map(t => {
                const className = t.includes('抱石') ? 'tag-bouldering' : 'tag-lead';
                return `<span class="${className}">${t}</span>`;
            }).join('');

            return `
                <div class="gym-info-window">
                    <h3>${gym.name}</h3>
                    <p><span class="label">🏢 行政區:</span> ${gym.district}</p>
                    <p><span class="label">📍 地址:</span> ${gym.address || gym.addr}</p>
                    <p><span class="label">📞 電話:</span> ${gym.phone || gym.tel}</p>
                    <p><span class="label">🧗 類型:</span> ${types}</p>
                    <a href="${gym.website || '#'}" target="_blank">造訪官網 &rarr;</a>
                </div>
            `;
        }
    };

    // 3. MapContainer Module
    const MapContainer = {
        map: null,
        init() {
            // 初始化地圖，設置在台北市中心
            this.map = L.map('map').setView([25.045, 121.53], 12);

            // 使用 OpenStreetMap 標準底圖 (色彩豐富：綠地、藍水、黃路)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);

            return this.map;
        }
    };

    // 4. MarkerManager Module
    const MarkerManager = {
        createMarkers(map, gyms) {
            gyms.forEach(gym => {
                const lat = gym.lat || (gym.location && gym.location.lat);
                const lng = gym.lng || (gym.location && gym.location.lng);

                if (lat && lng) {
                    const marker = L.marker([lat, lng]).addTo(map);
                    
                    marker.bindPopup(InfoWindow.render(gym), {
                        className: 'custom-popup',
                        offset: [0, -32]
                    });

                    marker.on('click', (e) => {
                        map.panTo(e.latlng);
                    });
                }
            });
        }
    };

    async function init() {
        const map = MapContainer.init();
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.createMarkers(map, gyms);
        console.log("台北市攀岩地圖 - 標準色彩版已啟動");
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
