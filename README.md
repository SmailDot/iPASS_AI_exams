# 學習步調 · iPAS 中級科目三

**目前階段：本機個人試用，暫不發布公共練習站。**

本機啟動／打包版本 **0.1.1**；學習介面與題庫維持 **0.1.0**。保留32道原創題、8道程式題、2道圖表題、8個短課、動態選題、逐選項解析、IndexedDB、JSON備份與恢復。不是官方网站，不是完整全科題庫或正式模考，不保證正式分數。

## Windows 先用起來

下載本次測試產物內的 `iPAS_Local_0.1.1.zip`，**完整解壓縮**後雙擊 `Start_Local.cmd`。需要 Node.js 22 或更新版本；未安裝時啟動器會提示，沒有自動安裝任何東西。無須 npm install、Python、API金鑰、GitHub Pages 或 VPS。

瀏覽器開啟：`http://127.0.0.1:4173/iPASS_AI_exams/`。保留命令視窗，按 Ctrl+C 停止服務。請固定使用同一網址／瀏覽器；換裝置或清理前先匯出 JSON。

已有原始碼時，在根目錄執行 `npm start` 或 `npm.cmd start`。原始碼自動先建置，試用ZIP使用已驗證的打包檔案。不要雙擊 `web/index.html`。

完整繁體中文步驟、常見錯誤、USB Android測試與Wi-Fi HTTPS設定：[本機試用說明](docs/LOCAL_TESTING.md)。

## 不公開的界線

預設僅綁定 `127.0.0.1`，沒有公開隧道，不自動放行區網，不上傳個人成績。

專案工作流程已移除 Pages 部署，僅做檢查、打包與測試。**這不會撤下舊的 Pages 頁面，也不會關閉 GitHub另外管理的從分支發布。** 管理者須在 Settings → Pages 將 Source 選 Deploy from a branch、Branch選 None、Save。不要刪除儲存庫。

儲存庫原本公開，本次沒有改變可見性；「本機試用」不是「原始碼保密」。完整官方 PDF、個人成績、筆記、備份或憑證不提交。

## 品質與功能邊界

題目、學習規則與資料格式沒有因本機版重写。保留同站圖片校驗、文字程式及參照測試、故障題不計錯、頁面內確認、重複交卷防護、多分頁衝突提示與保存失敗備份。

本機試用包加入完整性清單，缺檔或位元組改變會拒絕啟動；這是防意外損壞，不是簽章或來源真實性認證。服務限制可讀檔案與路徑、拒絕其他Host與跨來源讀取、採固定埠避免進度看似消失。

仍未提供完整全科题庫、正式難度校準、AI自由文字批改、無限出題、自動跨裝置同步、完整手機離線包或APK。USB連接可先測Android，Wi-Fi模式需可信任本機HTTPS；不支援直接用一般區網HTTP繞過安全情境要求。

## 開發測試

```sh
npm run check
npm test
npm run test:code
npm run build
# 另一個終端機先 npm start
npm run test:browser
```

Python只用於開發測試與打包，學習者使用試用ZIP不需要Python。測試依賴見 `tests/requirements.txt`。

新增10項Node本機伺服器契約測試；Windows CI實際執行 `Start_Local.cmd`，確認自動建置、HTTP、圖片與只綁定本機。完整結果請看**本次commit的CI**，不以舊版綠燈代替新版驗證。實體Android、TLS憑證信任及Windows預設瀏覽器自動打開仍需現場試用。

打包（開發者）：先 `npm run build`，再 `python scripts/package-local.py`，輸出 `release/iPAS_Local_0.1.1.zip`。

## 後續路線

先個人試用 → 修正與擴充題庫 → HTTPS雲端測試 → 決定是否公共發布／Android App。公開發布需另行建立手動部署流程，本版没有部署工作。

[Android延伸](docs/ANDROID_PATH.md) · [自適應設計](docs/ADAPTIVE_LEARNING.md) · [品質要求](docs/QUALITY_GATES.md) · [0.1初版驗證](docs/RELEASE_0.1.md)
