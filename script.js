/**
 * Taipei Climbing Gym Map - Simple & Stable Version
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
            // 處理攀岩類型標籤
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

            // 使用 CartoDB Light 底圖，視覺效果最清晰
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO'
            }).addTo(this.map);

            return this.map;
        }
    };

    // 4. MarkerManager Module
    const MarkerManager = {
        createMarkers(map, gyms) {
            gyms.forEach(gym => {
                // 自動偵測不同的座標欄位格式
                const lat = gym.lat || (gym.location && gym.location.lat);
                const lng = gym.lng || (gym.location && gym.location.lng);

                if (lat && lng) {
                    const marker = L.marker([lat, lng]).addTo(map);
                    
                    // 綁定資訊視窗
                    marker.bindPopup(InfoWindow.render(gym), {
                        className: 'custom-popup',
                        offset: [0, -32]
                    });

                    // 點擊標記時自動平移置中
                    marker.on('click', (e) => {
                        map.panTo(e.latlng);
                    });
                }
            });
        }
    };

    // 初始化應用程式
    async function init() {
        const map = MapContainer.init();
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.createMarkers(map, gyms);
        console.log("台北市攀岩地圖 - 穩定版已啟動");
    }

    return { init };
})();

// 當 DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
