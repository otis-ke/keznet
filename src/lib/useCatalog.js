import { useEffect, useMemo, useState } from "react";
import { listCatalog, priceKey, watchPrices } from "./db.js";
import { millis } from "./util.js";

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(b.name);

async function fetchCatalogue() {
  let cats = [], products = [];
  try {
    [cats, products] = await withTimeout(Promise.all([listCatalog("categories"), listCatalog("products")]), 10000);
  } catch (e) {
    console.warn("Live catalogue unavailable, using static copy", e);
  }
  if (!products.length) {
    // Static snapshot (public/data/catalog.json) keeps the shop working if the database is unreachable
    try {
      const snap = await (await fetch(`${import.meta.env.BASE_URL}data/catalog.json`)).json();
      const toList = (o) => Object.entries(o || {}).map(([id, d]) => ({ id, ...d }));
      cats = toList(snap.categories); products = toList(snap.products);
    } catch (e) { console.error(e); }
  }
  return { cats, products };
}

// Catalogue (read only) + RAYORA LIGHTING's own prices, merged and kept live.
// Each product gets:
//   basePrice — the catalogue's price (reference only)
//   price     — what RAYORA LIGHTING shows: its own price if set, otherwise the catalogue's
//   oldPrice  — the catalogue's crossed-out price, only when RAYORA LIGHTING hasn't set its own
//   ownPrice  — true when the price comes from RAYORA LIGHTING
export function useCatalog() {
  const [raw, setRaw] = useState({ status: "loading", cats: [], products: [] });
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    fetchCatalogue().then(({ cats, products }) =>
      setRaw(!products.length && !cats.length ? { status: "failed", cats: [], products: [] } : { status: "ready", cats, products }));
  }, []);
  useEffect(() => watchPrices(setPrices), []);

  return useMemo(() => {
    const cats = [...raw.cats].sort(byOrder);
    const order = new Map(cats.map((c) => [c.id, c.order ?? 999]));
    const catOrder = (p) => order.get(p.categoryId) ?? 999;
    const products = raw.products
      .filter((p) => p.active !== false && p.mainImage)
      .map((p) => {
        const own = prices?.[priceKey(p.id)]?.price;
        const hasOwn = typeof own === "number";
        return { ...p, basePrice: p.price ?? null, price: hasOwn ? own : p.price ?? null, oldPrice: hasOwn ? null : p.oldPrice ?? null, ownPrice: hasOwn };
      })
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || catOrder(a) - catOrder(b) || millis(b.createdAt) - millis(a.createdAt));
    return { status: raw.status, cats, products, pricesLoaded: prices !== null };
  }, [raw, prices]);
}
