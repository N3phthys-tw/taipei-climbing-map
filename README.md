https://n3phthys-tw.github.io/taipei-climbing-map/
# 🧗‍♂️ 台北市攀岩場館圖資平台 (Taipei Climbing Map)

本專案是一個基於 **Google Maps JavaScript API** 開發的專業地理資訊交互平台，專為台北市攀岩場館數據的檢索與導航設計。系統整合了動態路徑規劃、空間數據過濾（Spatial Filtering）以及行政區域交互視覺化系統。

---

## 🛠️ 核心技術特性

### 1. 座標定位與導航狀態管理 (Navigation State Management)
* **預設起始點**：系統初始化時，自動於 **(25.040456, 121.503585)** 建立黑色標記作為預設中心與起點。
* **導航優先權邏輯**：
    * **預設模式**：路徑規劃優先以「預設地點」作為計算起點。
    * **定位模式**：僅當使用者點擊「定位按鈕」成功獲取 GPS 座標後，路徑規劃才改以「目前位置（紅點）」計算。
* **狀態重置機制**：當使用者點擊導航卡片右側的 **[X]** 關閉按鈕時，系統將自動：
    * 清除地圖路徑藍線。
    * 隱藏導航卡片。
    * **強制重置**起點回歸「預設地點」。
    * 視角平移回預設中心點。

### 2. GIS 空間交互邏輯 (Spatial Interaction)
* **標記聚合 (Marker Clustering)**：採用高效率標記聚合算法，優化大量點位數據在不同縮放層級下的顯示效能。

### 3. 多維度數據過濾 (Multi-dimensional Filtering)
* 支持「抱石 (Bouldering)」與「上攀 (Lead)」等場館類型的過濾。
* **前端狀態同步**：篩選結果將同步反映於左側資訊欄卡片與地圖標記點。

---

## 🏗️ 技術棧 (Tech Stack)

* **地圖服務庫**: Google Maps JavaScript API
    * `DirectionsService` & `DirectionsRenderer` (導航路徑)
    * `google.maps.Data` (GeoJSON 行政區處理)
    * `MarkerClusterer` (標記聚合)
* **前端架構**: HTML5, CSS3, Vanilla JavaScript (ES6+)
* **數據格式**: JSON (場館屬性), GeoJSON (台北市行政邊界)

---

## 💻 本地環境設置

請按照以下步驟在本地啟動開發環境：

1.  **複製儲存庫**：
    ```bash
    git clone [https://github.com/](https://github.com/)[您的用戶名]/taipei-climbing-map.git
    cd taipei-climbing-map
    ```

2.  **配置 API 金鑰**：
    在 `index.html` 的指令碼引入處，將 `YOUR_API_KEY` 替換為有效的 Google Cloud 憑證：
    ```html
    <script src="[https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry&callback=initMap](https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry&callback=initMap)" async defer></script>
    ```

3.  **運行本地伺服器**：
    由於 Geolocation API 要求在安全連線環境下運行，建議使用伺服器環境開啟：
    * **VS Code**: 安裝 `Live Server` 插件。
    * **Python**: `python -m http.server 8000`
    * **Node.js**: `npx serve .`

---

## 📊 介面佈局規範

* **左側控制區**：包含搜尋欄、場館類型勾選器與具備細緻邊框的場館資訊卡片。
* **頂部導航卡片**：啟動導航後顯示，**僅呈現距離數據**，隱藏預計時間。右側設有功能性關閉按鈕。
* **右上角控制項**：圖層切換按鈕（具備展開選單）與定位按鈕，位置經校準避開原生縮放元件。
* **資訊視窗 (InfoWindow)**：點擊標記顯示，整合名稱、類型標籤、電話、營業時間、收費與路徑規劃按鈕。

---

## 🌐 部署說明 (Deployment)

專案支援 **GitHub Pages** 一鍵部署。請確保透過 `https://` 協定訪問網頁，否則瀏覽器將會封鎖定位功能請求。

---

**Disclaimer**: *本專案僅供開發測試與地理資訊展示參考，導航路徑請以實際路況為準。*
