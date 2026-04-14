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
                    <p><span class="label">📍 地址:</span> ${gym.address}</p>
                    <p><span class="label">📞 電話:</span> ${gym.phone}</p>
                    <p><span class="label">🕒 營業時間:</span> ${gym.operatingHours}</p>
                    <p><span class="label">🧗 類型:</span> ${types}</p>
                    <a href="${gym.website}" target="_blank">造訪官網 &rarr;</a>
                </div>
            `;
        }
    };

    // 3. MapContainer Module
    const MapContainer = {
        map: null,
        init() {
            // Initialize map centered at Taipei City
            this.map = L.map('map').setView([25.045, 121.53], 12);

            // Add OpenStreetMap tile layer
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
                const marker = L.marker([gym.location.lat, gym.location.lng]).addTo(map);
                
                // Bind Popup
                marker.bindPopup(InfoWindow.render(gym), {
                    className: 'custom-popup'
                });

                // Add Click Event for PanTo effect
                marker.on('click', (e) => {
                    map.panTo(e.latlng);
                });
            });
        }
    };

    // Initialization Logic
    async function init() {
        const map = MapContainer.init();
        const gyms = await DataFetcher.fetchGyms();
        MarkerManager.createMarkers(map, gyms);
    }

    return { init };
})();

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
