# 學習步調 · iPAS 中級科目三

手機優先、免登入、原創變體與本機動態選題的第一版網站（0.1.0）。不是官方網站，不保證正式分數或通過機率。

**32題是小批試用，不是全考綱覆蓋，也不是完整正式模考。** 部署與測試是否完成，請看GitHub Actions及版本紀錄，不將程式寫完等同驗收完成。

## 已寫入的功能

- 32道原創題、8道程式題、2道原創數據圖、8個觀念短課。
- 動態補強、混合、程式專練、指定單元；依未見題、近期錯誤、信心、前置技能、到期複習及覆蓋安排下一組。
- 題目與選項順序開始後固定，以選項ID計分；不會、理由、信心、輔助標記、有效時間。
- 頁面內交卷確認、重複提交防護、逐選項解析、TXT報告。
- IndexedDB進度恢復、revision防止多分頁覆寫；保存失敗明示，記憶體仍可匯出。
- JSON校驗、預覽與去重合併。舊HTML TXT只作參照，不冒充已重核的得分。
- 同站圖片SHA-256及解碼檢查，故障題不扣分、不更新學習證據。
- 程式以文字呈現，複製及參照測試使用同一份內容；不在瀏覽器執行任意Python。
- 窄螢幕、觸控底部導覽、程式橫向捲動、圖表放大及加入主畫面Manifest。

## 未包含

APK、實體Android驗收、完整離線包、跨裝置自動同步、AI自由文字批改、無限生成题、正式考試難度校準與完整全科題庫。

本版採原生JavaScript ES modules，沒有正式環境第三方套件或CDN，取代先前提出的React/TypeScript/Vite方案。沒有TypeScript型別檢查；改由資料校驗、純函式及瀏覽器測試保護。題庫、規則、儲存與畫面分層，詳見[Android延伸](docs/ANDROID_PATH.md)。

## 開發與使用

建置需Node 22以上；學習者使用網站不需要Node、Python或API金鑰。

```sh
npm start
```

開啟終端機顯示的本機網址，路徑是`/iPASS_AI_exams/`。不要雙擊`web/index.html`：它是原始碼，題庫指紋與圖片需先建置。

```sh
npm run check
npm test
npm run build
```

產物在`dist/`。題目與圖表內容均隨同版本打包。

## GitHub Pages第一次啟用

管理者進入 **Settings → Pages → Source → GitHub Actions**。
再到 **Actions → Verify and publish → Run workflow** 執行。
成功後以部署步驟回傳的網址為準；README不是練習站。

每次推送`mastar`先執行內容、單元、程式參照及瀏覽器測試；通過且Pages已設定為Actions才發布。未設定時明確跳過部署，不假裝已上線。不需要提供管理員Token。

## 測試

```sh
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
npm run test:code
# 另一終端機先 npm start
npm run test:browser
```

測試參照環境：Python 3.13.5、NumPy 2.3.5、scikit-learn 1.8.0。這是測試依賴，不是開站需安裝的東西。

[版本驗證紀錄](docs/RELEASE_0.1.md)區分已執行與待驗收。CI產物包含截圖及結果JSON。所有測試使用合成紀錄。

## 來源與資料邊界

官方PDF只作考點定位，沒有把整份PDF或完整官方題庫上傳。每題來源標示為官方相關考點或工程補充，不能冒充真題。Recall依1150410勘誤採TP/(TP+FN)。

個人成績、筆記、備份只留在瀏覽器，沒有分析追蹤，不傳回GitHub。公開原始碼包含答案，適用誠實自測而非防作弊。瀏覽器清理、私密模式或裝置遺失可能丟失本機資料，請定期備份。

原始[自適應規劃](docs/ADAPTIVE_LEARNING.md)與[品質規格](docs/QUALITY_GATES.md)是長期目標，不代表20項功能均已實作。當前邊界以本README、版本紀錄及實際測試為準。
