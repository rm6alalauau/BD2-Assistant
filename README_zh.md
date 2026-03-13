<div align="center">
  <h1>BD2 Assistant</h1>
  <p>專為《棕色塵埃 2 (Brown Dust 2)》打造的開源瀏覽器擴充功能，提供互動桌面寵物與兌換碼通知服務。</p>

  [🇹🇼 繁體中文](./README_zh.md) | [🇬🇧 English](./README.md)
  <br><br>

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/oehoeoilhngfbkblpbflljckfphdgphg?label=Chrome%20Web%20Store&color=blue)](https://chromewebstore.google.com/detail/oehoeoilhngfbkblpbflljckfphdgphg)
  [![Edge Add-ons](https://img.shields.io/badge/Edge%20Add--ons-BD2%20Assistant-blue)](https://microsoftedge.microsoft.com/addons/detail/bd2-assistant/famjnidglcmgfleijneljeobkipndkaf)
</div>

---

## 📥 安裝與下載

| 瀏覽器 | 下載連結 |
| :---: | :--- |
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" width="30" /> | [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/oehoeoilhngfbkblpbflljckfphdgphg?utm_source=item-share-cb) |
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" width="30" /> | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/bd2-assistant/famjnidglcmgfleijneljeobkipndkaf) |

---

## 🌟 專案簡介

**BD2 Assistant** 是一款搭配 [The BD2 Pulse](https://thebd2pulse.com/) 網站所開發的開源瀏覽器擴充功能。

本工具能在網頁上渲染《棕色塵埃 2》角色的 Spine 動態模型作為桌面寵物陪伴使用者，並具備背景資料比對機制，即時提醒與協助玩家兌換尚未領取的遊戲序號。

## ✨ 核心特性

- **互動桌面寵物**：於瀏覽器畫面無縫展示動態角色，並提供高自由度設定，包含角色服裝變更、尺寸與位置鎖定、透明度調整，以及鏡像翻轉顯示。
- **智慧兌換碼通知**：系統將於背景自動掃描官方最新可用序號，並與使用者本地的已兌換紀錄進行交叉比對。偵測到新序號時，隨即透過氣泡視窗進行通知。
- **無縫安全兌換 (Client-side Execution)**：採取嚴格的資訊安全標準，所有的兌換請求均由使用者的本地瀏覽器端，直接發送至遊戲官方伺服器端點。兌換程序完全等同於在官網進行手動輸入，且免去第三方中繼網站干涉，確保帳號與資料安全。
- **智慧 CSP 規避**：內建內容安全策略 (Content Security Policy) 偵測機制。若擴充功能在如網路銀行等具備嚴格安全限制之網頁執行，將自動暫停模型與畫布渲染，避免引發腳本衝突並兼顧系統整體效能。背景同步程序則不受此限。

## ⚠️ 使用須知

本擴充功能依賴 [The BD2 Pulse](https://thebd2pulse.com/) 前端服務初始化資料：
1. **暱稱同步機制**：使用者須先於 The BD2 Pulse 網站上設定遊戲暱稱。隨後至本擴充功能設定面板，點擊「從網站同步」，方能正確載入暱稱與歷史兌換紀錄並啟用完整自動檢查功能。
2. **網域黑名單**：除系統自動判定規避的網頁外，您亦可主動進入「進階設定」將特定網站加入黑名單，避免渲染桌面寵物。

## 🚀 開發與建置

本專案基於 Vite 與 TypeScript 進行開發。若您欲於本地端進行編譯或環境建置，請參考以下指令：

```bash
# 1. 下載程式碼與安裝相依套件
npm install

# 2. 啟動開發環境 (含熱重載)
npm run dev

# 3. 輸出正式生產版本 (含 post-build 清理)
npm run build
```

編譯完成後，請前往瀏覽器的「擴充功能管理」頁面並開啟「開發人員模式」，接著點擊「載入未打包項目」，選擇專案內的 `dist/` 目錄即可完成本地安裝。

## 📜 版本紀錄 (Changelog)

#### v2.2.0
- **WebShop 自動簽到**：新增 BD2 WebShop 每日簽到與活動簽到自動執行功能，於背景定時檢查並簽到，結果透過寵物氣泡通知顯示。
- **多帳號管理**：支援同步與管理多個 WebShop 帳號，以遊戲角色暱稱作為唯一識別，各帳號獨立追蹤簽到狀態與 Token。
- **登入驗證機制**：Token 同步現需前往 WebShop「我的頁面」並偵測角色暱稱，確保僅儲存已驗證的有效 Token。
- **寵物氣泡通知**：簽到結果改以與兌換碼相同風格的寵物頭上氣泡顯示，取代 Chrome 系統通知。
- **API 預檢查**：簽到前先透過 API 確認當日是否已完成，避免重裝擴充功能後重複簽到。
- **帳號移除**：可於設定面板單獨移除已同步的帳號。
- **Token 過期提示**：過期的 Token 會在介面上標記提示，引導使用者重新同步。

#### v2.1.4
- **大幅提升本地模型選單載入速度**: 現在開啟小工具面板時，系統會自動將本地模型的動作清單等資訊快取至瀏覽器儲存空間。下次打開時能「瞬間」生成下拉選單，不需要再等待畫布重新發送訊息解析，整體操作大幅順暢。
- **修復本地模型下拉選單卡死的問題**: 修復了因非同步檢查官方 DLC 資源時，其回傳的 Callback 產生競態條件 (Race Condition)，導致本地模型的動作選單被瞬間意外清空並反灰扣死的嚴重錯誤。現在開啟任何本地模型都能穩定切換動作。
- **背景保護機制升級**: 加入防寫入保護。現在即使頁面尚未完全加載完畢或背景發生短暫斷線，傳回來的空陣列也不會破壞已經存在儲存空間裡的有效動作快取，確保介面的穩定性。

#### v2.1.3
- **本地模型支援**: 開放使用者自行載入本地 Spine 模型 (`.skel`/`.json`, `.atlas`, `.png`)，並可自由選擇與切換模型內建的各種動作，提供更大的客製化彈性 (僅支援 Spine 4.1 格式)。
- **無限制縮放與重置**: 針對本地模型解除了縮放限制；並於設定面板新增「重置位置與大小」按鈕，幫助您在模型過大或迷失於畫面外時一鍵恢復預設狀態。
- **初次體驗優化**: 擴充功能安裝後，將依據瀏覽器的介面語言自動套用預設顯示語系，帶來更直覺的初始設定體驗。
- **穩定性與狀態記憶**: 修復記憶體洩漏閃退、縮放視窗重繪異常、重新整理後動作重置、以及切換本地模型時的 T-pose 閃爍問題。

#### v2.0.0
- **動態資產配置**: 將模型資料、別名與角色對應資料的儲存方式，從本地端綑綁遷移至遠端動態 JSON 配置 (`assistant.thebd2pulse.com/config/models.json` 等)。這確保了未來新增模型時，使用者不需更新擴充功能版本即可直接取得。
- **模型更新介面**: 於角色搜尋面板新增獨立的「檢查模型更新」按鈕 (支援多語系)，允許使用者手動強制同步遠端資產。
- **安全策略規避**: 透過將特定資產下載請求改由背景服務 (Background Service Worker) 路由處理，成功修復了在具有嚴格內容安全策略 (CSP) 的網頁 (如 Google 首頁) 上，模型資源被阻擋而無法初始化的問題。
- **佈局邏輯改良**: 針對不同視窗大小與捲軸出現與否導致的佈局偏移問題，將拖移位置記錄邏輯改良回絕對像素 (Pixel) 偏移計算機制，以確保在所有頁面上呈現高度一致性。

#### v1.7.0 
- **效能優化**: Spine 模型資料存取端點全面遷移至 Cloudflare R2，大幅提升載入頻寬與穩定度。
- **操作優化**: 面板新增模型鏡像翻轉 (Flip Horizontal) 獨立開關功能。

## 🙏 致謝 (Credits)

本專案之 Spine 模型渲染核心組件，係基於 [Jelosus2/BD2-L2D-Viewer](https://github.com/Jelosus2/BD2-L2D-Viewer) 進行修改與實作，特別感謝原作者釋出的優秀開源專案。

---

> **免責聲明**：本專案為社群開源工具，僅提供便利性增強，與《棕色塵埃 2》官方無任何從屬與正式合作關係。
