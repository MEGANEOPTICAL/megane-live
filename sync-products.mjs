/* MEGANE catalogue sync — scrapes the live Wix store and writes products.json
   Run by .github/workflows/sync-products.yml (nightly + manual). */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const SHOP_URL = 'https://www.megane.com.au/category/all-products';
const BRANDS = ['Naito Kumahachi','Leowl in eye','Kaneko Optical','UNSUIKYO','Masunaga',
                'ORIENS','EYEVAN','mamuse','MAXIS','Nclan','Kaneko','DITA']; // longest first

const splitName = (name) => {
  for (const b of BRANDS) {
    if (name.toLowerCase().startsWith(b.toLowerCase())) {
      return { brand: b, model: name.slice(b.length).trim() || name };
    }
  }
  const i = name.indexOf(' ');
  return i === -1 ? { brand: name, model: name } : { brand: name.slice(0,i), model: name.slice(i+1) };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(SHOP_URL, { waitUntil: 'networkidle', timeout: 90000 });

/* click "Load More" until the whole catalogue is on the page */
for (let i = 0; i < 20; i++) {
  const btn = page.locator('[data-hook="load-more-button"], button:has-text("Load More")').first();
  if (!(await btn.count()) || !(await btn.isVisible().catch(() => false))) break;
  await btn.click().catch(() => {});
  await page.waitForTimeout(1800);
}
await page.waitForTimeout(1500);

const items = await page.$$eval('[data-hook="product-item-root"], li[data-hook="product-list-grid-item"]', els =>
  els.map(el => {
    const q = sel => el.querySelector(sel);
    const name  = q('[data-hook="product-item-name"]')?.textContent?.trim() || '';
    const price = q('[data-hook="product-item-price-to-pay"], [data-hook="product-price"]')?.textContent?.trim() || '';
    const img   = q('img')?.src || '';
    const oos   = !!q('[data-hook="product-item-out-of-stock"]') ||
                  /out of stock/i.test(el.textContent || '');
    return { name, price, img, oos };
  })
);
await browser.close();

const products = items
  .filter(p => p.name)
  .map(p => {
    const { brand, model } = splitName(p.name);
    const price = parseFloat((p.price.match(/[\d,]+(\.\d+)?/) || ['0'])[0].replace(/,/g, '')) || null;
    return { brand, model, price, imgUrl: p.img.split('?')[0], oos: p.oos || !price };
  });

if (products.length < 5) {
  console.error(`Only ${products.length} products scraped — refusing to overwrite products.json (selectors may have changed).`);
  process.exit(existsSync('products.json') ? 0 : 1); // keep the old file, don't fail the site
}

const next = JSON.stringify(products, null, 2);
const prev = existsSync('products.json') ? readFileSync('products.json', 'utf8') : '';
if (next === prev) { console.log('No catalogue changes.'); process.exit(0); }
writeFileSync('products.json', next);
console.log(`Wrote products.json with ${products.length} products.`);
