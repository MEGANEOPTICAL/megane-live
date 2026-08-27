# MEGANE Optical — website source

Live site: https://www.megane.com.au (GitHub Pages, repo `MEGANEOPTICAL/megane-live`, branch `main`).
Wix runs ONLY the store/checkout/members at https://shop.megane.com.au (it is the Wix site's PRIMARY domain — do not change that, checkout URLs depend on it).

## Files
- `index.html` — the ENTIRE site: one file containing all pages (Home/Collection/Brands/Lenses/About/Membership/Booking), CSS, and JS. Deploy = replace this one file in the repo.
- `scripts/sync-products.mjs` — Playwright scraper that reads the Wix store (`shop.megane.com.au/category/all-products`) and writes `products.json` (brand/model/price/img/oos).
- `.github/workflows/sync-products.yml` — runs the scraper nightly (and manually via Actions → "Sync MEGANE catalogue"). Do not delete; it keeps the catalogue fresh.
- `products.json` — generated; lives in the repo. Never edit by hand.

## How the site talks to Wix (in index.html, bottom `<script type="module">`)
- Wix Headless OAuth Client ID: `12d75b6a-9d07-4c46-9e7a-3efea62728c9` (public, safe in code).
- Live product query builds a name→{id, slug, inStock} map; products Wix can't sell show "Sold out".
- Cart uses Wix currentCart APIs; ALWAYS render the cart from the API response object, never re-fetch after a write (stale reads caused bugs). Checkout: createCheckoutFromCurrentCart → createRedirectSession(ecomCheckout) → rewrite host to shop.megane.com.au (`fixHost`).
- Membership Join buttons: listPublicPlans → createRedirectSession(paidPlansCheckout) → direct plan checkout. Clicks are always intercepted and wait up to 8s for the bridge (`whenWixReady`).
- Newsletter posts to Wix Forms: form `48179b9b-984c-4882-b5c7-02488c92e848`, email field key `email_443e`, consent checkbox key `form_field_de1e` (sent as `true` → green tick in dashboard).
- Booking: full-screen overlay iframe of `app.ooptify.com/bookings?locationId=b9f726b2-f9c2-4943-9e5f-b4d93f5cbb07` with a floating "MEGANE · Back to home" button.
- Config block near the top of the main `<script>`: SHOP_BASE, BOOKING_URL, MEMBER_URL, INSTAGRAM_URL, STORE_PHOTO (empty — paste a shopfront photo URL and a hidden section auto-appears), NEWSLETTER_* keys.

## Editing rules that saved us many bugs
1. All internal navigation is JS page-switching with hash deep links (#brands, #lenses, #about, #member, #shop). `goHash()` must stay deferred via `setTimeout(goHash,0)` — calling it synchronously crashes on hash URLs (TDZ on `io`).
2. Never declare a second `const seen` inside the products.json loader (name-clash killed the whole script once).
3. `[hidden]{display:none!important}` must stay — several elements rely on the hidden attribute beating display:flex.
4. All links to Wix/Ooptify open in the SAME tab (owner's requirement). The shop hands its homepage back to the main site via custom code on the Wix side.
5. products.json loader dedupes by brand|model|price — keep it.
6. After every deploy: hard-refresh (Ctrl+Shift+R) before testing; GitHub Pages caches aggressively.

## Deploying a change
GitHub → repo → `index.html` → Edit → select all → paste the new full file → Commit. Wait ~2 min, hard-refresh the live site.

## Known owner-side tasks (not code)
- Wix Store inventory counts are mostly 0 → products show "Out of stock online". Enter real stock in Wix (Store Products → Inventory), or untrack inventory per product.
- GitHub Pages Settings → tick "Enforce HTTPS" when available.
- Optional: deleting the 5 hidden Wix pages (Brands/Lenses/About/HOYA/TOKAI) activates the dormant 301 redirects in Wix's URL Redirect Manager.
