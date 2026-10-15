# Signal Chrome extension

This is an unpacked Manifest V3 extension, not a published Chrome Web Store listing.

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this `extension` folder.
3. Visit a page, open Signal’s toolbar popup, and choose **Check current page**.

The check runs locally after that click, using `activeTab` and `scripting`. It reports rendered title, description, heading, alt, canonical, viewport, language, and JSON-LD counts. It does not assign the web audit’s score, fetch robots.txt, or inspect server response headers. Restricted browser pages cannot be inspected.

**Open public audit in Signal** opens Signal with the current URL prefilled; the user must run the audit. That action shares the URL with Signal. Do not use it for private URLs or URLs containing secrets. The local DOM check does not send page text, cookies, or credentials anywhere.

Store publication requires the owner’s Chrome Web Store developer account, privacy disclosures, and review. No store listing is claimed by this repository.
