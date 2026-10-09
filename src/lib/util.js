import { useEffect } from "react";
import { WHATSAPP, CURRENCY } from "./config.js";

// Ask Cloudinary for a resized, auto-format version of the image
export function img(url, w = 800) {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${w}/`);
}

export function money(p) {
  if (p === null || p === undefined || p === "" || isNaN(Number(p))) return null;
  return `${CURRENCY} ${Number(p).toLocaleString("en-KE")}`;
}

export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

export const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Save an image to the device. Cloudinary images get a real download with a
// readable filename (fl_attachment); other links are fetched, or opened as a fallback.
export async function downloadImage(url, name) {
  const a = document.createElement("a");
  a.rel = "noopener";
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    a.href = url.replace("/upload/", `/upload/fl_attachment:${name}/`);
  } else {
    try {
      const blob = await (await fetch(url)).blob();
      a.href = URL.createObjectURL(blob);
      a.download = name + "." + ((blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg"));
    } catch { window.open(url, "_blank", "noopener"); return; }
  }
  document.body.appendChild(a); a.click(); a.remove();
  if (a.download) setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const millis = (t) => (typeof t === "number" ? t : 0);

// Scroll-reveal: any element with class "reveal" gets data-in="1" once it
// scrolls into view (CSS does the animation). Picks up elements React adds later.
export function useReveal() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.dataset.in = "1"; io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    const scan = (root) => {
      const els = root.matches?.(".reveal:not([data-in])") ? [root] : [];
      root.querySelectorAll?.(".reveal:not([data-in])").forEach((el) => els.push(el));
      els.forEach((el) => (reduce ? (el.dataset.in = "1") : io.observe(el)));
    };
    scan(document.body);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}
