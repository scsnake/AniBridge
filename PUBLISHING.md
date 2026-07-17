# AniBridge 發布與更新指南

本文件說明如何把 AniBridge 發布到 GitHub 與 Chrome Web Store，並在之後安全地更新。Chrome Web Store 的版本與套件規則以 Chrome 官方文件為準；發布前應再次確認 Dashboard 顯示的欄位與要求。

## 1. 發布前檢查

1. 在 Chrome 安裝中實測動畫瘋、Netflix、Disney+、Hami Video、MAL 與 AniList 的支援頁。
2. 執行完整檢查：

   ```bash
   npm run check
   uv run --python 3.11 --with playwright python tests/ui_browser_test.py
   uv run --python 3.11 --with playwright python tests/extension_smoke_test.py
   ```

3. 確認 `manifest.json` 的 `name`、`description`、icon、權限與網域都是本版實際需要的內容。首次上傳後，若要改 manifest metadata，必須修改檔案、提高版本並重新上傳。
4. 準備商店素材：簡介、詳細說明、至少一張實際操作截圖、聯絡方式，以及可公開瀏覽的隱私說明頁。README 的「隱私」段落可作為起點，但送審前應依 Dashboard 的資料使用問卷逐項填寫。

## 2. 建立公開 GitHub repository

先在 GitHub 建立空白的 Public repository，然後在專案根目錄執行（把 URL 換成自己的）：

```bash
git add .
git commit -m "chore: initial public release"
git remote add origin https://github.com/你的帳號/anibridge.git
git push -u origin main
```

不要提交任何私密金鑰、Chrome profile、測試登入資料或商店 API token。現有 `.gitignore` 應保留；發布 zip 也不應包含 `.git`。

## 3. 建立 Chrome Web Store 套件

從專案根目錄建立 zip。`manifest.json` 必須位於 zip 的根目錄，不能被包進額外的 `anime-db-bridge/` 資料夾。

```bash
zip -r ../anibridge-0.9.1.zip . \
  -x '.git/*' 'tests/*' '*.md' '.gitignore' 'package.json'
```

上傳前可以解壓到暫存資料夾檢查根目錄是否直接看得到 `manifest.json`。不要把私有 Chrome 憑證、`.pem` 簽章私鑰或開發用 profile 放入套件。

## 4. 首次送審與公開

1. 註冊 Chrome Web Store 開發者帳號並啟用 Google 帳戶兩步驟驗證。
2. 開啟 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)，選擇 **Add new item**，上傳 zip。
3. 完成 Store Listing、Privacy practices、Distribution；先以 Private／trusted testers 測試也可以，確認後改為 Public。
4. 隱私聲明須如實描述：AniBridge 會把作品標題／年份或公開作品 ID 查詢 Bangumi 與 AniList；使用者設定儲存在 Chrome sync storage；不讀取串流登入憑證，也不在背景檢索串流搜尋結果。
5. 選擇送審後自動發布，或使用 deferred publishing 在審查通過後手動發布。通過審查後才會對一般使用者可見。

Chrome 對公開套件與每次更新都會審查。完整步驟請見 [Chrome 的首次發布文件](https://developer.chrome.com/docs/webstore/publish/) 與 [套件準備文件](https://developer.chrome.com/docs/webstore/prepare)。

## 5. 日後更新

每一次更新都必須維持**同一個 Web Store item**，並提高 `manifest.json` 的 `version`；例如 `0.9.1` → `0.9.2`。同時更新 `package.json`、README／HANDOFF 的版本說明，再執行測試與重新建立 zip。

1. 修改程式與文件，並把 `manifest.json` 版本提高。
2. 跑第 1 節的測試。
3. 建立新 zip。
4. 在同一個 Dashboard item 的 **Package** 分頁選 **Upload New Package**。
5. 視需要更新 Store Listing、Privacy practices 與 Distribution，然後 **Submit for Review**。
6. 通過後，既有使用者會由 Chrome 自動取得較高版本；Chrome 通常在啟動與每隔數小時檢查更新，且擴充功能閒置時才安裝。需要立即取得新版的使用者可在 `chrome://extensions` 開啟開發人員模式後按「更新」。

不可為更新另建一個 item，否則會得到新的 extension ID，既有使用者不會收到自動更新。發布後若發現重大問題，優先使用 Dashboard 的 rollback，而不是覆寫已發布版本。

更新的官方參考：[更新既有項目](https://developer.chrome.com/docs/webstore/update/)、[更新生命週期](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle)、[manifest version 規則](https://developer.chrome.com/docs/extensions/reference/manifest/version)。

## 6. 設定與快取行為

- 平台顯示設定寫入 `chrome.storage.sync`。測試已驗證關閉並重啟 Chromium 後仍會恢復；若使用者開啟 Chrome Sync，也會同步至其登入的其他 Chrome。
- 在相同 Web Store item 上升版更新，不會主動清除這些設定。新增平台時，現有設定會和新預設值合併，因此不會因新增欄位重設使用者原有選項。
- 作品比對快取在 `chrome.storage.local`，保存 7 天。程式提高 `CACHE_VERSION` 時，舊快取會刻意失效以避免舊資料結構留在卡片上；這不影響平台顯示設定。
- 移除擴充功能或手動清除擴充功能資料可能使本機資料消失；不要把設定視為帳戶備份。

Chrome Storage API 的同步與持久性說明見 [官方 storage 文件](https://developer.chrome.com/docs/extensions/reference/api/storage/)。
