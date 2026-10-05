# 手機優先與Android延伸

目前是0.1版網站，不是APK，尚未上架或驗收實體Android。

## 現有基礎

手機排版、觸控目標、底部安全區留白、程式橫向捲動、圖片放大、相對資源與hash路由已寫入。Web App Manifest與192/512圖示支援相容瀏覽器加入主畫面。

沒有Service Worker或完整離線包；重新開站需要網路，不能宣稱完整離線。

## 可沿用與仍需改造

| 層 | 檔案 | Android方向 |
|---|---|---|
|題庫與短課|web/src/catalog.js|沿用內容及素材版本|
|計分、選題、備份|web/src/engine.js|純函式可沿用|
|儲存|web/src/storage.js|另接原生儲存，維持版本防覆寫契約|
|素材檢查|web/src/assets.js|對接打包資產，仍校驗完整性|
|畫面與動作|web/src/app.js|抽出原生分享、檔案及返回鍵|
|建置輸出|dist/|可作Capacitor的webDir|

本版使用原生ES modules，不綁特定前端框架。Capacitor官方提供從既有Web專案加入Android原生容器的路徑，但本版尚未安裝或初始化原生工程。

轉Android前仍需驗證鍵盤遮擋、旋轉、返回鍵、背景回收、重啟、檔案分享、資料遷移與網路中斷。瀏覽器與App的儲存不會自動互通，WebView也不能假設與桌機下載行為相同。

加入完整離線內容的版本更新策略，再測試飛航模式。簽章、權限、隱私說明與商店要求依發行當時核對。沒有在本版要求付款或開發者帳號。

Android App不必等於帳號制；跨裝置同步是另行設計的身分與後端問題。

官方技術參考：
- https://capacitorjs.com/docs
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
