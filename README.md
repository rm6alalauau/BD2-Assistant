<div align="center">
  <h1>BD2 Assistant</h1>
  <p>An open-source browser extension for Brown Dust 2, bringing interactive desktop pets and automated coupon code notifications right to your screen.</p>

  [🇹🇼 繁體中文](./README_zh.md) | [🇬🇧 English](./README.md)
  <br><br>

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/oehoeoilhngfbkblpbflljckfphdgphg?label=Chrome%20Web%20Store&color=blue)](https://chromewebstore.google.com/detail/oehoeoilhngfbkblpbflljckfphdgphg)
  [![Edge Add-ons](https://img.shields.io/badge/Edge%20Add--ons-BD2%20Assistant-blue)](https://microsoftedge.microsoft.com/addons/detail/bd2-assistant/famjnidglcmgfleijneljeobkipndkaf)
</div>

---

## 📥 Downloads & Installation

| Browser | Extension Link |
| :---: | :--- |
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" width="30" /> | [Install from Chrome Web Store](https://chromewebstore.google.com/detail/oehoeoilhngfbkblpbflljckfphdgphg?utm_source=item-share-cb) |
| <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" width="30" /> | [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/bd2-assistant/famjnidglcmgfleijneljeobkipndkaf) |

---

## 🌟 Overview

**BD2 Assistant** is an open-source companion extension designed to work alongside [The BD2 Pulse](https://thebd2pulse.com/). 

It renders a cute, animated Spine model of your favorite Brown Dust 2 character directly on your browser screen. Beyond being a desktop pet, the extension actively scans for unused game coupon codes in the background. When a new code is detected, or when you manually check, the character will display a notification bubble, allowing you to redeem rewards instantly with a single click.

## ✨ Key Features

- **Interactive Desktop Pet**: Seamlessly integrates dynamic character models on your screen. You can freely change characters and costumes, adjust their scale and opacity, lock their position, and even horizontally flip them to suit your browsing layout.
- **Smart Coupon Notification**: Automatically checks the official database for newly available coupon codes and cross-references them against your local redemption history. If an unused code is found, a prompt appears over the pet.
- **Secure Redemption (Client-side Execution)**: High-security standards are prioritized. All redemption requests are sent **directly from your browser** to the official game servers. This guarantees a safe "one-click redeem" experience without routing through any third-party intermediate proxies, perfectly mimicking manual entry on the official website.
- **Smart CSP Evasion**: Features an automatic Content Security Policy (CSP) detector. The extension automatically pauses character injection on highly sensitive websites (e.g., banking portals) to prevent console errors and script conflicts, without interrupting background coupon scans.

## ⚠️ Important Notes

This extension relies on [The BD2 Pulse](https://thebd2pulse.com/) to initialize user data:
1. **Nickname Synchronization**: You must first configure your game nickname on The BD2 Pulse website. Once set, open the extension's settings panel and click "Sync from Website" to load your nickname and redemption history to enable automatic checking.
2. **Domain Blacklist**: Aside from auto-detected CSP pages, you can manually add specific websites to the blacklist via the "Advanced Settings" menu to prevent the desktop pet from appearing.

## 🚀 Local Development

This project is built using Vite and TypeScript. If you wish to compile or build locally:

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (with HMR)
npm run dev

# 3. Build for production (outputs to dist/)
npm run build
```

After building, you can load the `dist/` folder via Chrome/Edge's "Load unpacked" option in the Extension Developer Mode.

## 📜 Changelog

#### v2.2.0
- **WebShop Auto Check-in**: Added automatic daily and event attendance for the BD2 WebShop. The extension checks in the background at configurable intervals and notifies results via pet speech bubbles.
- **Multi-Account Support**: Sync and manage multiple WebShop accounts. Each account is identified by its in-game nickname, with individual token storage and check-in tracking.
- **Login Verification**: Token sync now requires visiting the WebShop mypage (`/CT/mypage/`) and detecting the character nickname from the DOM, ensuring only authenticated tokens are saved.
- **API Pre-Check**: Before attempting check-in, the system queries the API to detect if today's attendance is already completed, preventing duplicate actions after extension reinstall.
- **Account Management**: Users can remove synced accounts individually from the popup UI.
- **Token Expiry Detection**: Expired tokens are flagged per-account with UI indicators, prompting re-sync.

#### v2.1.4
- **Local Model UI Optimization**: The popup now caches the parsed animation list of local models in `chrome.storage.local`. On subsequent popup opens, the dropdown is populated instantly from this cache, drastically improving usability.
- **Dropdown Freeze Fix**: Fixed a critical race condition where the async callback checking for official DLC models would inadvertently wipe the local model's animation dropdown, causing it to freeze.
- **Cache Protection**: Added defensive logic that rejects incoming empty arrays if a valid cache already exists, preventing transient failures from corrupting the saved animation list.

#### v2.1.3
- **Local Model Support**: Added the ability for users to load their own custom Spine models (`.skel`/`.json`, `.atlas`, `.png`) and freely select/play the embedded animations, bringing much greater customization flexibility (Only Spine 4.1 files are supported).
- **Unrestricted Scaling & Layout Reset**: Removed scale limitations specifically for local custom models. Introduced a new "Reset Size & Position" button in the settings panel to quickly restore the pet to its default state if it gets too large or lost off-screen.
- **UX Optimization**: The extension now automatically detects your browser's UI language upon first installation and applies the corresponding default locale, providing a more intuitive out-of-the-box experience.
- **Reliability & Persistence**: Fixed memory leak crashes, viewport scaling discrepancies, animation reset on reload, and T-pose flashes when loading local models.

#### v2.0.0
- **Dynamic Asset Configuration**: Migrated the storage for model data, aliases, and character mappings from local bundles to a remote, dynamic JSON configuration (`assistant.thebd2pulse.com/config/models.json` etc). This ensures new models appear without requiring extension updates.
- **Model Update UI**: Added a dedicated "Check Model Updates" button integrated directly into the character search panel (fully localized) to force manual synchronization of assets.
- **Security Bypass**: Resolved an issue where strict Content Security Policies (CSP) on certain pages (e.g., Google Homepage) blocked asset initialization by routing specific asset downloads through the background service worker.
- **Improved Layout Logic**: Position dragging has been refined back to a fixed pixel absolute offset calculation mechanism for superior consistency across pages with varying window sizes and scrollbars.

#### v1.7.0 
- **Performance Optimization**: Successfully migrated the Spine model assets endpoint to Cloudflare R2, drastically improving bandwidth speed and asset loading stability.
- **UX Improvement**: Added a dedicated toggle for horizontal mirroring (Flip Horizontal) in the settings panel.

## 🙏 Credits

The core Spine model rendering component of this project is based on [Jelosus2/BD2-L2D-Viewer](https://github.com/Jelosus2/BD2-L2D-Viewer). Special thanks to the original author for creating and sharing such an excellent open-source repository.

---

> **Disclaimer**: This is a community-driven open-source utility and is not affiliated with or endorsed by the official Brown Dust 2 team.
