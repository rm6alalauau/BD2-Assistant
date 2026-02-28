# BD2 Assistant 更新紀錄

---

## v2.1.4 - Local Model Loading Optimization & Bug Fixes
### What's New
- ⚡ **Local Model UI Optimization**: The popup now caches the parsed animation list of `local_` models in `chrome.storage.local`. On subsequent popup opens, the dropdown is populated instantly from this cache, bypassing the need to request it from the web page or reload the heavy `spine-loader` context again, drastically improving usability.
- 🐛 **Dropdown Freeze Fix**: Fixed a critical race condition where the async callback checking for official models' DLC status would unintentionally wipe the local model's animation dropdown, causing it to freeze as empty.
- 🛡️ **Cache Protection**: Added defensive logic that rejects and ignores incoming empty arrays `[]` (caused by momentary page loading issues) if a valid cache already exists, preventing failures from permanently corrupting the saved animation list.

---

## v2.1.3 - Local Custom Model Loading & Persistence Reliability
### What's New
- 🌟 **Local Custom Model Support**: Import and manage your own Spine 4.1 `.skel`/`.json` models seamlessly.
- ♻️ **Spine Memory Management**: Fixed WebGL context exhaustion crashes when invalid custom models are loaded.
- ✨ **Animation Persistence**: Fixed an issue where local models would reset to 'idle' when refreshing the page.
- 📐 **Stable Viewport Scaling**: Forced consistent 'setup' sizing so local models don't morph unexpectedly across identical animations.
- 🪟 **T-Pose Flash CSS fix**: Local models now visually initialize smoothly without an accidental T-pose flicker.
- 🔄 **Layout Reset Control**: Added a button to safely restore model size and position.**縮放繼承修復**：修復從大幅縮放的本地自訂模型切換回官方內建模型時，縮放比例未正確恢復限制的異常問題。

---

## 2.0.0 - 2026-02-23

### ✨ 新功能
- **動態資產配置**：模型資料與別名改由遠端動態同步，未來新增角色/服裝無需更新擴充功能版本。
- **檢查模型更新**：於角色搜尋面板新增獨立的「檢查模型更新/更新檢查」按鈕，可手動強制同步遠端資產配置。

### 🐛 效能與錯誤優化
- **安全策略規避**：利用背景服務路由處理，修復在具有嚴格內容安全策略 (CSP) 網頁 (如 Google 首頁) 上模型遭阻擋的問題。
- **佈局邏輯改良**：將拖移位置機制調整回絕對像素 (Pixel) 計算，確保跨網頁與不同視窗大小間的顯示一致性。

---

## 1.1.0 - 2026-02-09

### ✨ 新功能
- **即時開關**：在隱藏狀態下開啟「顯示助手」，助手會立即出現，不需重新整理頁面
- **設定同步**：透過 Google 帳號自動同步設定至所有裝置

### 🐛 錯誤修正
- 修復「顯示助手」關閉時，頁面載入瞬間仍會短暫閃爍的問題
- 修復隱藏狀態下，滾輪滾動被阻擋的問題
- 修正設定讀取時的鍵值不匹配問題

### 🌐 翻譯更新
- 「兌換碼」更名為「優惠券碼」以配合官方網站用語
- 更新日文、韓文、中文翻譯

---

## 1.0.0 - 初始發布

### ✨ 功能
- 🎭 桌面寵物：支援多種角色與造型
- 🎁 優惠券通知：自動偵測並通知新的優惠券碼
- 🔧 自訂設定：調整大小、透明度、鎖定移動/縮放
- 🌐 多語言支援：繁體中文、簡體中文、英文、日文、韓文
- ☁️ 雲端同步：設定自動同步至所有已登入的 Chrome 裝置
