// Data layer.
//   Catalogue (/otishub):          read only — there are deliberately no write functions for it.
//   Prices    (/luminance/prices): RAYORA LIGHTING's own prices, the only thing this site writes.
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get, set, remove, onValue, serverTimestamp } from "firebase/database";
import { firebaseConfig, CATALOG_ROOT, CATALOG_SITE_ID, PRICES_ROOT } from "./config.js";

const app = getApps().find((a) => a.name === "luminance") || initializeApp(firebaseConfig, "luminance");
const rtdb = getDatabase(app);

// ---------- catalogue (read only) ----------
export async function listCatalog(col) {
  const snap = await get(ref(rtdb, `${CATALOG_ROOT}/${col}`));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, d]) => ({ id, ...d, images: Array.isArray(d.images) ? d.images : Object.values(d.images || {}) }))
    .filter((d) => d.site === CATALOG_SITE_ID);
}

// ---------- RAYORA LIGHTING prices ----------
// { [productKey]: { price: number, updatedAt } }
export const priceKey = (productId) => productId.replace(/[.#$[\]/]/g, "_");

export const watchPrices = (cb) =>
  onValue(ref(rtdb, `${PRICES_ROOT}/prices`), (s) => cb(s.val() || {}), () => cb({}));

const priceRef = (productId) => ref(rtdb, `${PRICES_ROOT}/prices/${priceKey(productId)}`);

export const setPrice = (productId, price) => set(priceRef(productId), { price, updatedAt: serverTimestamp() });
export const clearPrice = (productId) => remove(priceRef(productId));
