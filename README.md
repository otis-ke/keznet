# Luminance — lighting & electrical shop

A shop website built with React and Vite. It shows the same products and photos as the
shared catalogue, under the Luminance name, with its own hero and **its own prices**.
Customers order on WhatsApp — there is no checkout.

| Page | What it is |
|---|---|
| `index.html` | The shop: dimmable chandelier hero, categories, search, product views, WhatsApp enquiries |
| `prices.html` | Price list: set Luminance's price for each product (linked as **Prices** in the nav) |

## How the data works

- **Products, photos, names, descriptions, categories** are read live from the shared
  catalogue (`/otishub` in the Firebase Realtime Database). This site has **no code that
  writes to the catalogue**, so nothing there can be changed from Luminance.
- **Prices** are Luminance's own, stored separately under `/luminance/prices/<productId>`.
  A product without a Luminance price shows the catalogue price (or "Ask for price").
  Changing a Luminance price never affects the other shop.
- New products added to the catalogue appear here automatically.

> The Prices page has no password, so anyone who opens `/prices.html` can change prices.
> The database itself is also open to writes. For real protection, add database rules
> (and sign-in) in the Firebase console.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 (shop) and /prices.html
npm run build      # production build into dist/ (+ SEO pages)
```

## Before going live

1. Set `SITE_URL` in `src/lib/seo.js` to the live address (e.g. `https://luminance.co.ke`).
   Until then, the build skips canonical URLs and the sitemap.
2. Add a `Sitemap:` line with that address to `public/robots.txt`.
3. Check the WhatsApp number in `src/lib/config.js` (it's currently the same as the other shop).
4. `.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main` and nightly.

## Project layout

```
index.html, prices.html     page entry points
src/lib/config.js           name, WhatsApp number, database locations
src/lib/db.js               read-only catalogue + Luminance prices
src/lib/useCatalog.js       loads the catalogue and applies Luminance prices (live)
src/shop/                   the shop (App, Hero, ProductDialog)
src/prices/                 the price list page
scripts/seo.mjs             build step: product/category pages, structured data, sitemap
```
