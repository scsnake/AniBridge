# AniBridge 動畫資料庫橋接器

AniBridge 是一個無廣告、免登入的 Chrome 瀏覽器擴充功能。它能在您觀看巴哈姆特動畫瘋、Disney+、Netflix 與 Hami Video 時，自動比對並提供對應的動畫資料庫（MyAnimeList、AniList、Bangumi 等）連結與評分資訊；同時也在 MyAnimeList 與 AniList 頁面補上繁體中文與日文標題，方便複製。

> ⚠️ 目前播放頁支援動畫瘋、Disney+、Netflix 與 Hami Video。串流上架狀態僅供參考。

---

## 🌟 主要功能

- **串流平台比對卡片**：在動漫播放/詳情頁面自動比對，顯示對應的動畫資料庫連結、原始評分與收藏排行。
- **資料庫中文標題補完**：在 MyAnimeList 與 AniList 作品頁，補上繁體中文與日文標題。
- **一鍵複製多語標題**：點擊卡片中的任一語言標題即可直接複製。
- **手動修正比對**：若遇到同名或季度比對不精確，可手動輸入標題與年份重新比對。
- **自訂平台顯示**：在擴充功能設定頁，可自由啟用或隱藏特定的評分/收藏平台。
- **本地端別名建議**：當在地化標題難以直接比對時，支援的裝置可主動啟用本機 AI 提供搜尋建議。

---

## 🛠️ 支援平台

- **串流來源**：巴哈姆特動畫瘋、Disney+、Netflix、Hami Video
- **資料庫與評分平台**：MyAnimeList、AniList、Bangumi (番組計劃)、Kitsu、Anime-Planet、AniDB、Annict、Simkl、LiveChart、Filmarks、あにこれ、IMDb

---

## 📦 安裝說明

目前支援以開發者模式手動載入：

1. 下載本專案原始碼並解壓縮。
2. 開啟 Chrome 瀏覽器，前往 `chrome://extensions/`。
3. 啟用右上角的 **「開發人員模式」**。
4. 點擊左上角 **「載入未封裝項目」**，並選取本專案資料夾。
5. 重新整理或開啟支援的串流/資料庫網頁，即可看到 AniBridge 資訊卡。

---

## 🔒 隱私與安全性

- **無帳號串接**：AniBridge 不會讀取或寫入您的任何平台登入憑證。
- **無背景抓取**：不會在背景自動查詢或解析串流搜尋結果，避免對目標網站造成不必要的連線負擔。
- **本地運算與快取**：比對成功的結果會安全地儲存於本機快取（`chrome.storage.local`）中；若使用 AI 別名建議功能，所有運算皆在您的瀏覽器本機端執行，絕不上傳。

---

## 💻 開發與測試

本專案基於 Node.js 開發，單元測試與瀏覽器測試可執行：

```bash
npm run check
uv run --python 3.11 --with playwright python tests/ui_browser_test.py
uv run --python 3.11 --with playwright python tests/extension_smoke_test.py
```

發布與更新流程請參閱 [PUBLISHING.md](PUBLISHING.md)。

---

## 📄 授權條款

本專案採用 [MIT License](LICENCE)。
`vendor/opencc-cn2t.js` 採用 MIT/Apache-2.0 授權，詳見 `vendor/` 資料夾。
