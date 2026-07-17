# AniBridge 動畫資料庫橋接器

AniBridge 是一個不需登入的 Chrome Manifest V3 擴充功能。它會在巴哈姆特動畫瘋、Disney+、Netflix 與 Hami Video 作品頁顯示對應的動畫資料庫連結，並在 MyAnimeList／AniList 作品頁補上繁體中文與日文標題。

> 目前播放頁支援巴哈姆特動畫瘋、Disney+、Netflix 與 Hami Video；Prime Video 尚未支援。串流上架狀態不會被推論或保證。

## 功能

- 在 `ani.gamer.com.tw/animeVideo.php` 以預設收合的右側抽屜顯示平台連結，不遮住影片與作品資料。
- 在 Disney+ 系列詳情頁與 Netflix 作品／播放頁顯示相同的資料庫連結卡；Netflix 播放頁會優先辨識母作品而非單集標題。
- 在 Hami Video `product/<ID>.do` 作品頁顯示資料庫連結卡，優先使用頁面 JSON-LD 的作品名稱；Hami Video 的上架／更新日期不會誤當成作品首播年。
- 部分串流頁面只提供母作品標題與年份，未提供使用者目前選擇的季度；這種情況下，跨站連結可能指向系列的其他季度或改為搜尋結果，加入清單前請確認季度與年份。
- 可在擴充功能設定勾選 MyAnimeList、AniList、Bangumi、Kitsu、Anime-Planet、AniDB、Annict、Simkl、LiveChart、Filmarks Anime、あにこれ與 IMDb。
- 設定頁的整個平台項目可切換是否顯示；旁邊的 ↗ 圖示會在新分頁開啟該平台首頁。
- 網頁資訊卡中的平台連結一律預設在新分頁開啟。
- MyAnimeList、AniList、Bangumi、Kitsu 預設啟用；其他平台由使用者依既有帳號與用途開啟。
- 顯示繁中、日本語、English（無英文時顯示 Romaji）標題。
- 點擊任一語言的標題即可複製該標題，並顯示「已複製」回饋。
- AniList 有提供明確 `Official Site` 外部連結時，卡片會顯示作品官方網站；資料隨原本的 AniList 查詢取得，不增加 API 次數。
- 對應到可確認作品頁時，資訊卡會顯示 AniList 與 Bangumi 的原始評分、評分人數／收藏人數與可用排名；分數維持各來源的原始量尺，不混合成單一總分。
- 在 MAL 與 AniList 作品頁顯示相同的多語標題卡。
- 在 MAL 與 AniList 卡片顯示使用者選擇的串流平台搜尋連結；動畫瘋與 Netflix 預設啟用，Hami Video 可在設定頁選擇啟用。
- 以作品名稱、首播年份、季度編號與作品類型比對，降低把續作、OVA、特別篇或劇場版配錯的機率。
- 低可信結果會清楚標示；無法確認作品 ID 時改連到搜尋結果。
- 可手動修改標題與年份後重新比對。
- 當串流頁的在地化標題無法比對時，支援的 Chrome 裝置可由使用者主動啟用本機 AI 建議搜尋別名；每個別名仍會經資料庫比對，且結果一律要求使用者確認。
- 成功結果在本機快取 7 天，並以 MAL／AniList ID 交叉索引。

## 安裝（開發者模式）

1. 開啟 `chrome://extensions/`。
2. 啟用右上角「開發人員模式」。
3. 選擇「載入未封裝項目」。
4. 選取本專案資料夾 `anime-db-bridge/`。
5. 開啟動畫瘋、Disney+、Netflix、Hami Video、MAL 或 AniList 的支援作品頁。

修改程式後，請在 `chrome://extensions/` 按擴充功能卡片上的重新載入，再重新整理目標頁面。

## 資料來源與比對策略

- **動畫瘋**：頁面上顯示的繁體中文標題與首播年，視為該串流頁的來源資料。
- **Bangumi**：日文原名、中文名與作品 ID。
- **AniList GraphQL API**：日文、英文、Romaji、年份、格式，以及對應的 MAL ID。
- **AniList／Bangumi 的公開評分欄位**：僅在作品被可靠對應時顯示來源分數、排名或評分人數；各站計分方式與母體不同，不應直接橫向比較。
- **作品官方網站**：取用 AniList `externalLinks` 中未停用且明確標為 `Official Site` 的資訊連結；不把社群或串流網站誤標成官方站。
- **OpenCC.js**：當作品並非由動畫瘋頁面開始查詢時，把 Bangumi 的中文名轉成臺灣繁體用詞；轉換在瀏覽器本機完成。

名稱本身並不唯一。同系列動畫可能只差季度、數字、標點或 `OVA／劇場版` 字樣，因此 AniBridge 也比較首播年、季度標記與媒體格式。Disney+ 與 Netflix 的部分版面目前只能擷取母作品標題與年份，無法可靠判定使用者正在看的季度；只有來源標題本身包含季度標記時，才能用於季度比對。結果仍可能受資料庫別名、頁面資料缺漏或季度資訊不足影響，加入個人清單前應確認作品頁的年份、類型與季度。

### 其他平台定位

- **Anime-Planet／AniDB**：同時具備收藏與社群評分，可作為英語圈的補充觀點。
- **Annict**：日本語觀看記錄服務，適合管理每集進度與觀看狀態。
- **Simkl／LiveChart**：適合跨媒體追蹤或當季播出提醒。
- **Filmarks Anime／あにこれ**：偏向日本使用者評分、感想與排行榜；列在卡片的「評分與排行」區，不假裝是已確認的收藏頁。
- **IMDb**：可補充一般影視受眾的評分與評論，但可能把整部電視系列合併呈現，未必對應 MAL 的單一季度，因此只提供搜尋連結。

### 動畫瘋反向搜尋與請求壓力

動畫瘋搜尋使用官方頁面 `search.php?keyword=...`。AniBridge 不在背景自動抓取或解析搜尋結果，因為該站會對自動請求啟用 Cloudflare 驗證，而且上架狀態可能受地區與授權期間影響。MAL 卡片只在使用者點擊時開啟一次搜尋，因此平時新增 **0 次**動畫瘋請求，也不會把搜尋命中誤標為確定可觀看。

若未來需要更完整的多語標題庫，可考慮加入 [AniDB 每日多語標題資料](https://wiki.anidb.net/API) 或 Wikidata；首版不下載 AniDB 的完整資料集，以避免擴充功能過大。

## 隱私

AniBridge 不讀取登入憑證，也不代替使用者修改任何動畫清單。查詢時只會把作品標題、年份或公開資料庫 ID 傳到 manifest 所列的 Bangumi 與 AniList API。Kitsu 僅保留使用者主動開啟的搜尋連結，不再進行 API 查詢。使用者在資料庫卡片點擊串流搜尋連結後，該平台會收到搜尋詞；AniBridge 不會在背景查詢或解析串流搜尋結果。比對結果只保存在 `chrome.storage.local`，可透過移除擴充功能或清除其資料刪除。

若 Chrome 的本機 AI 模型可用，別名建議只在瀏覽器裝置上產生，不會傳送給 AI 服務。功能需要使用者主動點擊，且可用性取決於 Chrome 版本、裝置硬體與模型下載狀態。

## 開發與測試

需求：Node.js 18+。瀏覽器測試使用 `uv` 建立暫時的 Python Playwright 環境，不會在專案內建立虛擬環境。

```bash
npm run check
uv run --python 3.11 --with playwright python tests/ui_browser_test.py
uv run --python 3.11 --with playwright python tests/extension_smoke_test.py
```

主要檔案：

- `background.js`：API 查詢、排名與快取。
- `lib/matcher.js`：純函式標題清理、相似度與季度／格式判斷。
- `lib/ui.js`：以 Shadow DOM 隔離的浮動介面。
- `lib/platforms.js`：平台目錄、分類與預設顯示狀態。
- `content-gamer.js`：動畫瘋頁面 metadata 擷取。
- `content-streaming.js`：Disney+／Netflix SPA 頁面的 metadata 擷取、路由觀察與卡片整合。
- `content-database.js`：MAL／AniList 頁面整合。
- `lib/streaming-adapters.js`：Disney+／Netflix 的可測試頁面 metadata adapter。
- `options/`：平台顯示選項頁。
- `icons/`：原創 SVG 圖示來源與 Chrome 所需 PNG 尺寸。

公開發布、Chrome Web Store 送審與日後自動更新的步驟請見 [PUBLISHING.md](PUBLISHING.md)。

## 開發協作

本專案的目前實作由開發者與 **OpenAI Codex（GPT-5）** 協作完成。使用 AI 輔助不改變貢獻者對提交內容的審查與責任。

## 第三方授權

`vendor/opencc-cn2t.js` 來自 OpenCC.js 1.4.1，依 MIT／Apache-2.0 授權散布；授權文字位於 `vendor/`。

## 授權

本專案採用 [MIT License](LICENCE)。
