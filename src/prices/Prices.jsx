import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_NAME, CURRENCY } from "../lib/config.js";
import { clearPrice, setPrice } from "../lib/db.js";
import { img, money } from "../lib/util.js";
import { useCatalog } from "../lib/useCatalog.js";
import { productPath } from "../lib/seo.js";
import { BulbMark } from "../components/BulbMark.jsx";

// Luminance's price list. Only prices can be changed here; everything else
// (names, photos, descriptions, categories) comes read-only from the catalogue.
export default function Prices({ onLogout }) {
  const { status, cats, products, pricesLoaded } = useCatalog();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [show, setShow] = useState("all"); // all | own | none

  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const parents = cats.filter((c) => !c.parent && products.some((p) => p.categoryId === c.id));

  const list = products.filter((p) => {
    if (cat && p.categoryId !== cat) return false;
    if (show === "own" && !p.ownPrice) return false;
    if (show === "none" && p.price != null) return false;
    if (q) {
      const hay = `${p.name} ${p.code || ""} ${catById.get(p.categoryId)?.name || ""}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const ownCount = products.filter((p) => p.ownPrice).length;

  return (
    <div className="pp">
      <header className="pp-bar">
        <a className="brand" href="/"><BulbMark className="brand-bulb" />{SITE_NAME}</a>
        <span className="pp-tag">Admin · Prices</span>
        <a className="btn btn-amber sm" href="/" target="_blank" rel="noopener">View shop ↗</a>
        <button className="pp-out" onClick={onLogout}>Sign out</button>
      </header>

      <main className="pp-main">
        <div className="pp-head">
          <h1>Your prices</h1>
          <p>Set the price {SITE_NAME} shows for each product. Leave a box empty to use the catalogue price. Names, photos and descriptions come from the shared catalogue and can&apos;t be changed here. Changes appear on the shop instantly.</p>
        </div>

        <div className="pp-tools">
          <input type="search" placeholder="Search products or model codes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="pp-seg" role="group" aria-label="Filter">
            {[["all", "All"], ["own", "Your prices"], ["none", "No price"]].map(([v, l]) => (
              <button key={v} className={show === v ? "on" : ""} onClick={() => setShow(v)}>{l}</button>
            ))}
          </div>
        </div>

        <p className="pp-sum">
          {status === "loading" || !pricesLoaded ? "Loading…" : `${list.length} of ${products.length} products · ${ownCount} with your own price`}
        </p>

        {status === "failed" && <div className="pp-empty">Couldn&apos;t load the catalogue. Check your connection and refresh.</div>}

        <div className="pp-list">
          <div className="pp-row pp-th" aria-hidden="true">
            <span></span><span>Product</span><span>Catalogue price</span><span>Your price ({CURRENCY})</span><span></span>
          </div>
          {list.map((p, i) => (
            <PriceRow key={p.id} p={p} cat={catById.get(p.categoryId)} i={i} />
          ))}
          {status === "ready" && pricesLoaded && !list.length && <div className="pp-empty">No products match.</div>}
        </div>
      </main>
    </div>
  );
}

function PriceRow({ p, cat, i }) {
  const current = p.ownPrice ? String(p.price) : "";
  const [value, setValue] = useState(current);
  const [state, setState] = useState(""); // "" | saving | saved | error
  const [focused, setFocused] = useState(false);
  const lastSaved = useRef(current);

  // follow live changes (e.g. another tab) unless the box is being edited
  useEffect(() => { lastSaved.current = current; if (!focused) setValue(current); }, [current, focused]);

  async function save() {
    const v = value.trim();
    if (v === lastSaved.current) return;   // nothing changed (or already saved by Enter)
    if (v !== "" && (!/^\d+(\.\d{1,2})?$/.test(v))) { setState("error"); return; }
    setState("saving");
    lastSaved.current = v;
    try {
      if (v === "") await clearPrice(p.id);
      else await setPrice(p.id, Number(v));
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "" : s)), 1600);
    } catch (e) {
      console.error(e);
      lastSaved.current = current;
      setState("error");
    }
  }

  return (
    <div className={"pp-row" + (p.ownPrice ? " own" : "")} style={{ "--d": `${Math.min(i, 16) * 18}ms` }}>
      <a className="pp-thumb" href={productPath(p.id)} target="_blank" rel="noopener" title="See it in the shop">
        <img src={img(p.mainImage, 120)} alt="" loading="lazy" />
      </a>
      <div className="pp-name">
        <b>{p.name}</b>
        <small>{[cat?.name, p.code].filter(Boolean).join(" · ")}</small>
      </div>
      <span className="pp-base">{money(p.basePrice) || <span className="muted">—</span>}</span>
      <label className={"pp-input " + state}>
        <input inputMode="decimal" placeholder={p.basePrice != null ? String(p.basePrice) : "Ask for price"}
          value={value} aria-label={`Your price for ${p.name}`}
          onChange={(e) => { setValue(e.target.value); setState(""); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); save(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { save(); e.currentTarget.blur(); } if (e.key === "Escape") { setValue(current); e.currentTarget.blur(); } }} />
        <span className="pp-state" aria-live="polite">
          {state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved" : state === "error" ? "Numbers only" : ""}
        </span>
      </label>
      <span className="pp-acts">
        {p.ownPrice && (
          <button title="Use the catalogue price again" onClick={() => { setValue(""); clearPrice(p.id).then(() => setState("saved")).catch(() => setState("error")); }}>↺ Reset</button>
        )}
      </span>
    </div>
  );
}
