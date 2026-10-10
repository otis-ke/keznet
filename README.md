# Luminance — lighting & electrical shop

A shop website built with React and Vite. It shows the same products and photos as the
shared catalogue, under the Luminance name, with its own hero and **its own prices**.
Customers order on WhatsApp — there is no checkout.

| Page | What it is |
|---|---|
| `index.html` | The shop: dimmable chandelier hero, categories, search, product views, WhatsApp enquiries |
| `prices.html` | Admin (password protected): set Luminance's price for each product. Linked as **Admin** in the footer |

## How the data works

- **Products, photos, names, descriptions, categories** are read live from the shared
  catalogue (`/otishub` in the Firebase Realtime Database). This site has **no code that
  writes to the catalogue**, so nothing there can be changed from Luminance.
- **Prices** are Luminance's own, stored separately under `/luminance/prices/<productId>`.
  A product without a Luminance price shows the catalogue price (or "Ask for price").
  Changing a Luminance price never affects the other shop.
- New products added to the catalogue appear here automatically.

> The admin page is password protected and can only change Luminance's prices. The password is
> checked against SHA-256 hashes in `src/lib/config.js` (`ADMIN_PASS_SHA256`); the password itself is
> never stored. This is a browser-side check: the database itself is still open to writes, so for
> real protection add database rules (and sign-in) in the Firebase console.

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
3. The WhatsApp number (0721 672 190) is set in `src/lib/config.js`.
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
