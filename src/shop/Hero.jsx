import { useEffect, useRef, useState } from "react";

// Luminance hero: a hanging three-ring chandelier with a working dimmer.
// Brightness drives the glow; warmth (colour temperature in kelvin) drives the colour.

const MIN_K = 2700, MAX_K = 6500;
const PRESETS = [
  { label: "Warm", k: 2700, b: 85 },
  { label: "Soft", k: 3500, b: 60 },
  { label: "Neutral", k: 4200, b: 90 },
  { label: "Daylight", k: 6500, b: 100 },
];

// warm amber → soft white → cool daylight
const STOPS = [[2700, [255, 170, 92]], [3500, [255, 206, 150]], [4500, [255, 236, 214]], [6500, [214, 232, 255]]];
function kelvinToRgb(k) {
  for (let i = 1; i < STOPS.length; i++) {
    const [k1, c1] = STOPS[i - 1], [k2, c2] = STOPS[i];
    if (k <= k2) {
      const t = (k - k1) / (k2 - k1);
      return c1.map((v, j) => Math.round(v + (c2[j] - v) * t));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const TICKER = ["Chandeliers", "Pendants", "Wall lamps", "Outdoor lights", "Ceiling lights", "Panel lights", "Downlighters", "Bulbs", "Snake lights", "String lights", "Mirror lights", "Floor lamps"];

export default function Hero() {
  const [on, setOn] = useState(true);
  const [bright, setBright] = useState(85);
  const [kelvin, setKelvin] = useState(3000);
  const heroRef = useRef(null);

  // gentle parallax on the chandelier (desktop only)
  useEffect(() => {
    const el = heroRef.current;
    if (!el || matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);

  const [r, g, b] = kelvinToRgb(kelvin);
  const level = on ? bright / 100 : 0;
  const preset = on ? PRESETS.find((p) => p.k === kelvin && p.b === bright) : null;

  return (
    <section className={"hero lhero" + (on ? "" : " off")} id="top" ref={heroRef}
      style={{ "--lc": `${r}, ${g}, ${b}`, "--lv": level.toFixed(2) }}>
      <div className="lhero-glow" aria-hidden="true"></div>

      <div className="lhero-grid">
        <div className="lhero-copy">
          <p className="eyebrow rise" style={{ "--d": "0.15s" }}>Lighting &nbsp;/&nbsp; Electrical &nbsp;/&nbsp; Kenya</p>
          <h1>
            <span className="ln"><span style={{ "--d": "0.3s" }}>Light, shaped</span></span>
            <span className="ln"><span style={{ "--d": "0.45s" }}>to <em>every room.</em></span></span>
          </h1>
          <p className="lede rise" style={{ "--d": "0.7s" }}>Chandeliers, pendants and wall lights, plus the cables, switches and fittings to install them. Browse the collection, then order straight on WhatsApp.</p>
          <div className="hero-cta rise" style={{ "--d": "0.85s" }}>
            <a href="#shop" className="btn btn-amber">Browse the collection</a>
            <a href="#how" className="btn btn-ghost">How ordering works</a>
          </div>
        </div>

        <div className="lhero-stage">
          <button type="button" className="halo" onClick={() => setOn((v) => !v)} aria-label={on ? "Turn the chandelier off" : "Turn the chandelier on"}>
            <span className="wires" aria-hidden="true"><i></i><i></i><i></i></span>
            <span className="canopy" aria-hidden="true"></span>
            <span className="rings" aria-hidden="true">
              <i className="ring r1"></i><i className="ring r2"></i><i className="ring r3"></i>
            </span>
            <span className="halo-floor" aria-hidden="true"></span>
          </button>

          <div className="dimmer rise" style={{ "--d": "1s" }}>
            <div className="dimmer-head">
              <span>Try the dimmer</span>
              <button type="button" role="switch" aria-checked={on} className={"power" + (on ? " on" : "")} onClick={() => setOn((v) => !v)}>
                <i></i>{on ? "On" : "Off"}
              </button>
            </div>
            <label className="slider">
              <span>Brightness <b>{on ? `${bright}%` : "Off"}</b></span>
              <input type="range" min="5" max="100" value={bright} onChange={(e) => { setBright(+e.target.value); setOn(true); }} />
            </label>
            <label className="slider warmth">
              <span>Warmth <b>{kelvin}K</b></span>
              <input type="range" min={MIN_K} max={MAX_K} step="100" value={kelvin} onChange={(e) => { setKelvin(+e.target.value); setOn(true); }} />
            </label>
            <div className="presets">
              {PRESETS.map((p) => (
                <button type="button" key={p.label} className={preset === p ? "on" : ""} style={{ "--pc": `rgb(${kelvinToRgb(p.k).join(",")})` }}
                  onClick={() => { setKelvin(p.k); setBright(p.b); setOn(true); }}>
                  <i></i>{p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>
    </section>
  );
}
