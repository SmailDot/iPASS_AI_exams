# 本機試用 0.1.1：先自己用，再決定上線

本次只調整啟動、打包、測試與發布流程。學習介面／題庫仍是 0.1.0：32 道原創題、8 道程式題、2 道圖表題與 8 個短課。沒有重新改答案、清除舊紀錄或把小題庫冒充全科模考。

## Windows：用試用 ZIP，不必學部署

1. 解壓縮**整個** `iPAS_Local_0.1.1.zip`，例如放在 `C:\iPAS_Local`。不要在 ZIP 預覽內直接執行，也不要只複製 HTML。
2. 電腦需有 Node.js 22 或更新版本；沒有時，從 https://nodejs.org/en/download 安裝官方 Windows LTS 一次。啟動器只檢查，不會自動下載或安裝軟體。
3. 雙擊 `Start_Local.cmd`。它會檢查版本、驗證已打包的網站檔案、啟動本機服務，然後嘗試打開預設瀏覽器。
4. 瀏覽器沒有自動開啟時，手動開啟 `http://127.0.0.1:4173/iPASS_AI_exams/`。
5. 保留啟動視窗；用完按 `Ctrl+C` 停止。瀏覽器裡的答案不是保存在該視窗，關閉服務不會主動刪除 IndexedDB。

試用 ZIP 已包含建置結果，不需要 `npm install`、Python、API 金鑰、登入、GitHub Pages 或 VPS。安裝好 Node 並取得完整套件後，本機啟動與練習不需向外部網站下載資源。這不代表手機瀏覽器已具備 Service Worker 離線包。

**固定使用同一個瀏覽器與上述網址。** `localhost`、`127.0.0.1`、其他連接埠與雲端網域是不同來源，不能保證看到同一份進度。換裝置、來源或清理瀏覽器前，先在「備份與設定」匯出 JSON；新位置再预覽、合併匯入。不要用無痕模式當正式學習紀錄。

## 已有原始碼：一條指令

在專案根目錄使用：

```sh
npm start
```

Windows PowerShell 若限制 `npm.ps1`，可改用 `npm.cmd start`；不必停用執行原則。原始碼版本會先以 Node 建置，再啟動。也可直接雙擊相同的 `Start_Local.cmd`。

試用 ZIP 沒有開發用 `web/`、測試與建置腳本；要執行完整開發測試，請使用 GitHub 原始碼，不要在試用 ZIP 內執行 `npm run build`。

## 預設只讓這台電腦連入

服務只綁定 `127.0.0.1:4173`，不自動綁定 `0.0.0.0`。不建立公開通道、不調整路由器、不放行防火牆、不上傳答案，也沒有任何寫入或遠端執行 API。只服務 `dist/` 內允許的網站檔案，拒絕越界路徑、其他 Host 與跨來源請求。

4173 被占用時會清楚失敗，不會殺掉別的程式，也不會偷偷切換連接埠導致你誤以為進度不見了。先關閉前一次的 iPAS 啟動視窗。確實需要別的埠時，在 PowerShell 明確設定：

```powershell
$env:IPAS_PORT = "4174"
node scripts/serve.mjs --open
```

更換埠等同換來源，要先匯出備份。

## Android 手機先測介面，不必先上雲

### 方法 A：USB 本機連接，建議先用這個

保留電腦服務只綁定回送位址。依 Chrome 官方文件設定電腦與 Android 的 USB 遠端偵錯，僅授權你自己的電腦。在電腦 Chrome 開 `chrome://inspect/#devices`，按 Port forwarding，將裝置端 `4173` 對到電腦端 `127.0.0.1:4173`，啟用後，在手機 Chrome 開啟 `http://localhost:4173/iPASS_AI_exams/`。

流量經 USB，不需開放公網或整個 Wi-Fi 網路。此步驟需要你自己的手機、USB授權與支援的 Chrome，並非網站自動替你開啟偵錯。測試完可關閉 USB 偵錯／撤銷電腦授權。

手機的瀏覽器資料和電腦仍各自保存，請用 JSON 搬移；這不是自動同步。

官方步驟：https://developer.chrome.com/docs/devtools/remote-debugging/local-server

### 方法 B：同一 Wi-Fi，需可信任的本機 HTTPS

**不能只把位址換成 `http://192.168.x.x` 就宣稱相容。** 本站使用的 `crypto.subtle` 和 `crypto.randomUUID` 需要安全情境；本機 localhost 與一般區網 HTTP 不同。此版刻意拒絕直接開放區網 HTTP，沒有移除校驗、停用瀏覽器安全設定或使用不安全旗標。

進階測試前需自行備妥：包含電腦實際區網 IP 的伺服器憑證、私鑰，以及手機端對該簽發來源的信任。只信任你自己管理的開發憑證，不略過警告；只在可信任私人網路測試。憑證與私鑰放 `.local-private/`，不提交 GitHub、不傳給別人。

例如電腦確實擁有 `192.168.1.20`，且下列憑證已正確準備：

```powershell
$env:IPAS_LAN_IP = "192.168.1.20"
$env:IPAS_TLS_CERT = ".local-private\server.pem"
$env:IPAS_TLS_KEY = ".local-private\server-key.pem"
node scripts/serve.mjs --lan
```

手機使用啟動器印出的 HTTPS 網址。服務只綁定指定且存在的私人 IPv4介面，不自動開放其他網卡。可能仍需依你的系統管理規範允許私人網路的此埠；不要停用整個防火牆，也不要做路由器公網轉發。

這是已提供的啟動介面，不代表已在你的手機驗證憑證信任。先完成方法A或桌機試用即可，不要為此提前上雲。

參考：https://developer.mozilla.org/en-US/docs/Web/API/Crypto

## 尚未公開：有兩個地方要分開處理

專案的 `.github/workflows/verify-and-publish.yml` 現在只有檢查、打包與測試產物，沒有 Pages 權限或部署工作。保留舊檔名只是避免混淆版本紀錄。

**移除專案部署，不會撤下之前已發布的頁面，也不會關閉 GitHub 另外管理的「從分支發布」。** 儲存庫管理者需在 Settings → Pages → Build and deployment，將 Source 選成 Deploy from a branch，Branch 選 None，再 Save。不要刪除儲存庫。這一步完成前，不能聲稱既有 Pages 網站已關閉。

官方步驟：https://docs.github.com/en/pages/getting-started-with-github-pages/deleting-a-github-pages-site

GitHub 儲存庫本身目前為公開；本次沒有擅自改成私人。即使不開放練習網址，公開原始碼仍可被其他人閱讀及下載。個人成績與官方完整 PDF 未加入儲存庫。

## 測試與驗收

保留原有題庫、規則、備份、程式輸出及瀏覽器測試；新增本機伺服器10項契約測試與 Windows 真正執行 CMD 的啟動測試。以本次 commit 的 GitHub Actions 結果為準，不能把舊版通過當新版已通過。

本地容器的 Node HTTP／路徑／綁定位址測試可執行；其受管 Chromium 阻擋 localhost 導航，因此完整瀏覽器測試使用 CI runner，沒有更改或繞過瀏覽器政策。Windows CI 不啟動預設桌面瀏覽器，而是驗證 CMD 自動建置、HTTP、圖片與回送位址；真正雙擊與實體 Android 仍需使用者試用。

第一輪只需做4～8題，確認讀碼／圖表 → 寫理由 → 交卷 → 重新整理恢復 → JSON備份／匯入。故障不要當作學習能力不足。

## 之後上雲或做 Android App

保留原有靜態 `dist/`、同站資產、IndexedDB資料格式與Android分層。日後可沿用 `npm run build` 的產物部署到HTTPS網站，或沿既有 `docs/ANDROID_PATH.md` 評估Android封裝。

公開前重新驗收圖片、程式、隱私、備份與手機操作，再另行新增**手動**部署工作流程；本版沒有可意外按出的發布開關。由localhost轉到網域或App時，用JSON遷移，不假設新來源能直接讀取舊來源的資料。
