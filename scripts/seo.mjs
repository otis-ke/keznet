// Runs after `vite build`. Fetches the live catalogue and writes, into dist/:
//   - index.html          home page with full SEO head, structured data and pre-rendered content
//   - c/<slug>/index.html one page per category
//   - p/<id>/index.html   one page per product
//   - 404.html            app fallback, so products added later still open
//   - sitemap.xml         every page above, with product images
// Each page is the normal app (same JS), so visitors get the full shop while
// search engines get real titles, descriptions, links and schema.org data.
import fs from "node:fs/promises";
import path from "node:path";
import { firebaseConfig, CATALOG_ROOT, CATALOG_SITE_ID, PRICES_ROOT, SITE_NAME, WHATSAPP, WHATSAPP_DISPLAY, CURRENCY } from "../src/lib/config.js";
import { SITE_URL, BASE_PATH, SITE_TITLE, SITE_DESCRIPTION, SITE_ALT_NAMES, MATERIALS, catSlug, catPath, productPath } from "../src/lib/seo.js";

const DIST = path.resolve("dist");
const ORG_ID = `${SITE_URL}${BASE_PATH}#store`;

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const img = (url, w = 800) => (url && url.includes("res.cloudinary.com") && url.includes("/upload/") ? url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${w}/`) : url || "");
const jpg = (url, w = 1200) => (url && url.includes("res.cloudinary.com") && url.includes("/upload/") ? url.replace("/upload/", `/upload/f_jpg,q_auto,c_limit,w_${w}/`) : url || "");
const clip = (s, n = 155) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
const money = (p) => (p === null || p === undefined || p === "" || isNaN(Number(p)) ? null : `${CURRENCY} ${Number(p).toLocaleString("en-KE")}`);
const isoDay = (ms) => (typeof ms === "number" ? new Date(ms).toISOString().slice(0, 10) : null);
const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const AVAIL = { in: "InStock", few: "LimitedAvailability", order: "PreOrder", out: "OutOfStock" };

async function loadCatalogue() {
  const toList = (o) => Object.entries(o || {}).map(([id, d]) => ({ id, ...d }));
  try {
    const base = `${firebaseConfig.databaseURL}/${CATALOG_ROOT}`;
    const [c, p] = await Promise.all(["categories", "products"].map(async (k) => {
      const r = await fetch(`${base}/${k}.json`);
      if (!r.ok) throw new Error(`${k}: HTTP ${r.status}`);
      return r.json();
    }));
    const cats = toList(c).filter((x) => x.site === CATALOG_SITE_ID), products = toList(p).filter((x) => x.site === CATALOG_SITE_ID);
    if (products.length) return { cats, products, source: "live database" };
  } catch (e) {
    console.warn("seo: live catalogue unavailable, using snapshot:", e.message);
  }
  const snap = JSON.parse(await fs.readFile("public/data/catalog.json", "utf8"));
  return { cats: toList(snap.categories), products: toList(snap.products), source: "snapshot" };
}

// ---------- page building ----------
const template = await fs.readFile(path.join(DIST, "index.html"), "utf8");
if (!template.includes("<!--seo:head-->") || !template.includes("<!--seo:body-->")) throw new Error("seo: markers missing from dist/index.html");

function page({ title, description, url, image, imageAlt = title, imageSize, type = "website", meta = [], schema = [], body = "", robots = "index,follow,max-image-preview:large,max-snippet:-1" }) {
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="robots" content="${robots}">`,
    ...(SITE_URL ? [`<link rel="canonical" href="${url}">`, `<meta property="og:url" content="${url}">`] : []),
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="en_KE">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}">`,
    ...(imageSize ? [`<meta property="og:image:width" content="${imageSize[0]}">`, `<meta property="og:image:height" content="${imageSize[1]}">`, `<meta property="og:image:type" content="image/png">`] : []),
    ...meta,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(imageAlt)}">`,
    ...schema.map(ld),
  ].join("\n");
  return template
    .replace(/<!--seo:head-->[\s\S]*?<!--\/seo:head-->/, head)
    .replace("<!--seo:body-->", body);
}

async function write(rel, html) {
  const file = path.join(DIST, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html);
}

// ---------- data ----------
const { cats: allCats, products: catalogProducts, source } = await loadCatalogue();
let ownPrices = {};
try { ownPrices = (await (await fetch(`${firebaseConfig.databaseURL}/${PRICES_ROOT}/prices.json`)).json()) || {}; }
catch (e) { console.warn("seo: couldn't load RAYORA LIGHTING prices:", e.message); }
const allProducts = catalogProducts.map((p) => {
  const own = ownPrices[p.id.replace(/[.#$[\]/]/g, "_")]?.price;
  return typeof own === "number" ? { ...p, price: own, oldPrice: null } : p;
});
const cats = allCats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(b.name));
const catById = new Map(cats.map((c) => [c.id, c]));
const products = allProducts.filter((p) => p.active !== false && p.mainImage);
const inCat = (c) => products.filter((p) => p.categoryId === c.id);
const parents = cats.filter((c) => !c.parent && inCat(c).length);
const featured = products.filter((p) => p.featured);
const showcase = featured.length ? featured : parents.map((c) => inCat(c)[0]).filter(Boolean);
const OG_DEFAULT = `${SITE_URL}${BASE_PATH}og-image.png`;
const OG_DEFAULT_META = { image: OG_DEFAULT, imageSize: [1200, 630], imageAlt: `${SITE_NAME}: chandeliers, pendant lights and electrical supplies in Kenya` };

const store = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": ORG_ID,
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  url: `${SITE_URL}${BASE_PATH}`,
  logo: `${SITE_URL}${BASE_PATH}icon-512.png`,
  image: OG_DEFAULT,
  description: SITE_DESCRIPTION,
  telephone: `+${WHATSAPP}`,
  currenciesAccepted: CURRENCY,
  areaServed: { "@type": "Country", name: "Kenya" },
  address: { "@type": "PostalAddress", addressCountry: "KE" },
  contactPoint: { "@type": "ContactPoint", telephone: `+${WHATSAPP}`, contactType: "sales", areaServed: "KE" },
  knowsAbout: MATERIALS.flatMap((g) => g.items.map(([label]) => label)),
};
const crumbs = (items) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
});
const itemList = (name, list) => ({
  "@context": "https://schema.org", "@type": "ItemList", name,
  itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: SITE_URL + productPath(p.id), name: p.name, image: jpg(p.mainImage, 800) })),
});
const productLinks = (list) => `<ul>${list.map((p) => `<li><a href="${productPath(p.id)}">${esc(p.name)}</a>${money(p.price) ? ` — ${money(p.price)}` : ""}</li>`).join("")}</ul>`;
const catLinks = () => `<ul>${parents.map((c) => `<li><a href="${catPath(c)}">${esc(c.name)} in Kenya</a> (${inCat(c).length})</li>`).join("")}</ul>`;
const supplyText = MATERIALS.map((g) => `<h2>${esc(g.title)}</h2><p>${g.items.map(([label, q]) => `<a href="${BASE_PATH}?q=${encodeURIComponent(q)}">${esc(label)}</a>`).join(", ")}</p>`).join("");
const contact = `<p>Order on WhatsApp: <a href="${wa(`Hi ${SITE_NAME}, I'm enquiring about your lighting and electrical products.`)}">${WHATSAPP_DISPLAY}</a></p>`;

const urls = [];

// ---------- home ----------
await write("index.html", page({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  url: `${SITE_URL}${BASE_PATH}`,
  ...OG_DEFAULT_META,
  schema: [
    store,
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}${BASE_PATH}#website`, name: SITE_NAME, alternateName: SITE_ALT_NAMES, url: `${SITE_URL}${BASE_PATH}`, inLanguage: "en-KE", publisher: { "@id": ORG_ID },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}${BASE_PATH}?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
    itemList(featured.length ? "Featured products" : "Popular products", showcase.slice(0, 20)),
  ],
  body: `<main class="pre"><h1>${esc(SITE_TITLE)}</h1><p>${esc(SITE_DESCRIPTION)}</p>
<h2>${featured.length ? "Featured products" : "Popular products"}</h2>${productLinks(showcase.slice(0, 20))}
<h2>Shop by category</h2>${catLinks()}${supplyText}${contact}</main>`,
}));
urls.push({ loc: `${SITE_URL}${BASE_PATH}`, priority: "1.0", changefreq: "daily" });

// ---------- categories ----------
for (const c of parents) {
  const list = inCat(c);
  const url = SITE_URL + catPath(c);
  const title = `${c.name} in Kenya — Prices & Photos | ${SITE_NAME}`;
  const description = clip(`Browse ${list.length} ${c.name.toLowerCase()} at ${SITE_NAME}, Kenya. See photos and prices, then order directly on WhatsApp ${WHATSAPP_DISPLAY}.`);
  await write(path.join("c", catSlug(c), "index.html"), page({
    title, description, url,
    image: jpg(c.cover || list[0]?.mainImage, 1200) || OG_DEFAULT,
    imageAlt: `${c.name} at ${SITE_NAME}, Kenya`,
    schema: [
      store,
      { "@context": "https://schema.org", "@type": "CollectionPage", name: `${c.name} in Kenya`, url, description, isPartOf: { "@id": `${SITE_URL}${BASE_PATH}#website` } },
      itemList(`${c.name} in Kenya`, list.slice(0, 50)),
      crumbs([["Home", `${SITE_URL}${BASE_PATH}`], [c.name, url]]),
    ],
    body: `<main class="pre"><p><a href="${BASE_PATH}">${SITE_NAME}</a> › ${esc(c.name)}</p><h1>${esc(c.name)} in Kenya</h1><p>${esc(description)}</p>${productLinks(list)}<h2>More categories</h2>${catLinks()}${contact}</main>`,
  }));
  const last = list.map((p) => p.updatedAt || p.createdAt).filter((x) => typeof x === "number").sort().pop();
  urls.push({ loc: url, priority: "0.8", changefreq: "weekly", lastmod: isoDay(last) });
}

// ---------- products ----------
for (const p of products) {
  const c = catById.get(p.categoryId), sub = catById.get(p.subcategoryId);
  const url = SITE_URL + productPath(p.id);
  const price = money(p.price);
  const kind = (sub || c)?.name;
  const title = `${p.name}${p.code ? ` (${p.code})` : ""}${kind ? ` — ${kind}` : ""} in Kenya | ${SITE_NAME}`;
  const description = clip(p.description
    ? `${p.name}: ${p.description}`
    : `${p.name}${kind ? `, ${kind.toLowerCase()}` : ""} available in Kenya at ${SITE_NAME}. ${price ? `Price ${price}.` : "Ask for price."} See all photos and order directly on WhatsApp.`);
  const images = [p.mainImage, ...(p.images || []).map((i) => i && i.url)].filter(Boolean);
  const product = {
    "@context": "https://schema.org", "@type": "Product",
    name: p.name, url, image: images.map((u) => jpg(u, 1200)),
    description: p.description || description,
    ...(p.code ? { sku: p.code, mpn: p.code } : {}),
    ...(kind ? { category: kind } : {}),
    ...(price ? { offers: {
      "@type": "Offer", url, priceCurrency: CURRENCY, price: Number(p.price),
      availability: `https://schema.org/${AVAIL[p.stock] || "InStock"}`,
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORG_ID },
    } } : {}),
  };
  const related = c ? inCat(c).filter((x) => x.id !== p.id).slice(0, 12) : [];
  const enquiry = `Hi ${SITE_NAME}, I'm enquiring about:\n\n*${p.name}*${p.code ? `\nModel: ${p.code}` : ""}${price ? `\nPrice: ${price}` : ""}\n${url}\n\nIs it available?`;
  await write(path.join("p", p.id, "index.html"), page({
    title, description, url, type: "product",
    image: jpg(p.mainImage, 1200),
    imageAlt: `${p.name}${kind ? ` — ${kind}` : ""}`,
    meta: price ? [
      `<meta property="product:price:amount" content="${Number(p.price)}">`,
      `<meta property="product:price:currency" content="${CURRENCY}">`,
      `<meta property="product:availability" content="${p.stock === "out" ? "out of stock" : "in stock"}">`,
      `<meta property="product:condition" content="new">`,
    ] : [],
    schema: [
      store, product,
      crumbs([["Home", `${SITE_URL}${BASE_PATH}`], ...(c ? [[c.name, SITE_URL + catPath(c)]] : []), [p.name, url]]),
    ],
    body: `<main class="pre"><p><a href="${BASE_PATH}">${SITE_NAME}</a>${c ? ` › <a href="${catPath(c)}">${esc(c.name)}</a>` : ""}</p>
<h1>${esc(p.name)}</h1>${p.code ? `<p>Model ${esc(p.code)}</p>` : ""}
<img src="${esc(img(p.mainImage, 900))}" alt="${esc(`${p.name}${kind ? ` — ${kind}` : ""}`)}" width="900" height="900">
<p>${price ? `Price: ${esc(price)}` : "Price on request."}</p>${p.description ? `<p>${esc(p.description)}</p>` : ""}
<p><a href="${wa(enquiry)}">Enquire on WhatsApp</a></p>
${related.length ? `<h2>More ${esc(c.name.toLowerCase())}</h2>${productLinks(related)}` : ""}</main>`,
  }));
  urls.push({ loc: url, priority: p.featured ? "0.8" : "0.6", changefreq: "weekly", lastmod: isoDay(p.updatedAt || p.createdAt), images: images.slice(0, 10).map((u) => ({ loc: jpg(u, 1200), title: p.name })) });
}

// ---------- 404 (keeps the app working for products added after this build) ----------
await write("404.html", page({
  title: `Page not found | ${SITE_NAME}`, description: SITE_DESCRIPTION, url: `${SITE_URL}${BASE_PATH}`, ...OG_DEFAULT_META, robots: "noindex",
  body: `<main class="pre"><h1>Page not found</h1><p><a href="${BASE_PATH}">Go to the ${SITE_NAME} shop</a></p></main>`,
}));

// ---------- sitemap ----------
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url>
    <loc>${esc(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${(u.images || []).map((i) => `
    <image:image><image:loc>${esc(i.loc)}</image:loc><image:title>${esc(i.title)}</image:title></image:image>`).join("")}
  </url>`).join("\n")}
</urlset>
`;
if (SITE_URL) {
  await fs.writeFile(path.join(DIST, "sitemap.xml"), xml);
  await fs.writeFile(path.join(DIST, "robots.txt"), `User-agent: *
Allow: /
Disallow: ${BASE_PATH}prices.html

Sitemap: ${SITE_URL}${BASE_PATH}sitemap.xml
`);
}
else console.warn("seo: SITE_URL is empty in src/lib/seo.js, so no sitemap or canonical URLs were written");

console.log(`seo: ${source} → home + ${parents.length} category pages + ${products.length} product pages, sitemap with ${urls.length} URLs`);
