https://n3phthys-tw.github.io/taipei-climbing-map/
🧗‍♂️ 台北市攀岩場館圖資平台 (Taipei Climbing Map)
本專案是一個基於 Google Maps JavaScript API 開發的專業地理資訊交互平台，專為台北市攀岩場館數據的檢索與導航設計。系統整合了動態路徑規劃、空間數據過濾（Spatial Filtering）以及行政區域交互視覺化系統。

🛠️ 核心技術特性
動態地理定位系統 (Dynamic Geolocation)：

整合瀏覽器 Geolocation API，即時獲取使用者座標並作為導航起點。

具備自動視角平移（Map Panning）功能，確保初始載入即以使用者為中心。

GIS 空間交互邏輯 (Spatial Interaction)：

行政區聚光燈效果：利用台北市行政區 GeoJSON 數據，在選中場館時動態觸發目標區域高亮，並對非相關區域套用半透明遮罩，強化視覺聚焦。

標記聚合 (Marker Clustering)：採用高效率標記聚合算法，優化大量點位數據在不同縮放層級下的顯示效能。

多維度數據過濾 (Multi-dimensional Filtering)：

支持「抱石 (Bouldering)」與「上攀 (Lead)」等場館類型的交集過濾。

前端狀態同步更新：篩選結果將同步反映於側邊資訊欄與地圖標記點。

導航路徑引擎：

串接 Google Directions Service，提供精確的距離計算。

具備「導航狀態重置」機制，可一鍵清除路徑並回歸全局視角。

🏗️ 技術棧 (Tech Stack)
地圖服務庫: Google Maps JavaScript API

DirectionsService & DirectionsRenderer

google.maps.Data (GeoJSON 處理)

MarkerClusterer

前端架構: HTML5, CSS3, Vanilla JavaScript (ES6+)

數據格式: JSON (場館數據), GeoJSON (行政邊界數據)

💻 本地環境設置
請按照以下步驟在本地啟動開發環境：

複製儲存庫：

Bash
git clone https://github.com/[您的用戶名]/taipei-climbing-map.git
cd taipei-climbing-map
配置 API 金鑰：
在 index.html 的指令碼引入處，將 YOUR_API_KEY 替換為有效的 Google Cloud 憑證：

HTML
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry&callback=initMap" async defer></script>
運行本地伺服器：
由於 Geolocation API 要求在安全環境下運行，請使用伺服器環境開啟專案：

VS Code: 安裝 Live Server 插件。

Python:

Bash
python -m http.server 8000
Node.js:

Bash
npx serve .
🌐 部署說明 (Deployment)
專案已優化為靜態網頁架構，支援 GitHub Pages 一鍵部署：

將代碼推送到 main 分支。

在 GitHub Repository 的 Settings > Pages 選項中，選擇從 main 分支部署。

部署完成後，請確保透過 https:// 協定訪問，以確保定位功能正常運作。

📊 介面佈局規範
左側控制區：包含搜尋欄與場館類型過濾器，為系統主要的交互入口。

頂部導航卡片：僅在啟動路徑規劃時顯示，呈現核心距離數據與清除功能。

地圖控制項：圖層切換與定位按鈕固定於右上角，避免與原生縮放元件產生 UI 衝突。

數據顯示：InfoWindow 提供標準化格式，呈現名稱、電話、營業時間與收費標準。

Disclaimer: 本專案僅供開發與地理資訊展示參考，導航路徑請以實際路況為準。
