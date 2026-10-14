import { useState } from "react";
import { ADMIN_PASS_SHA256, SITE_NAME } from "../lib/config.js";
import { sha256 } from "../lib/util.js";
import { BulbMark } from "../components/BulbMark.jsx";
import { BASE_PATH } from "../lib/seo.js";

// Password screen for the RAYORA LIGHTING admin (prices only).
// The password is checked against SHA-256 hashes in config.js.
const KEY = "luminance-admin";
const ok = (h) => ADMIN_PASS_SHA256.includes(h);
const readSession = () => { try { return ok(sessionStorage.getItem(KEY)); } catch { return false; } };

export default function Gate({ children }) {
  const [authed, setAuthed] = useState(readSession);
  const [pw, setPw] = useState("");
  const [state, setState] = useState("idle"); // idle | checking | wrong | ok
  const [err, setErr] = useState("");

  const logout = () => { try { sessionStorage.removeItem(KEY); } catch {} setAuthed(false); setPw(""); setState("idle"); };
  if (authed) return children(logout);

  async function submit(e) {
    e.preventDefault();
    if (state === "checking" || state === "ok") return;
    setErr(""); setState("checking");
    let hash;
    try { hash = await sha256(pw); }
    catch { setState("idle"); return setErr("This browser can't check the password on this address. Open the page over https or on localhost."); }
    if (!ok(hash)) { setState("wrong"); setErr("Wrong password."); return; }
    try { sessionStorage.setItem(KEY, hash); } catch {}
    setState("ok");
    setTimeout(() => setAuthed(true), 800);
  }

  const level = state === "ok" ? 1 : state === "wrong" ? 0 : Math.min(pw.length / 9, 1);

  return (
    <section className={`gate ${state}`} style={{ "--lvl": level }}>
      <div className="gate-glow" aria-hidden="true"></div>
      <form className="gate-card" onSubmit={submit}>
        <BulbMark className="gate-bulb" />
        <h1>{SITE_NAME} admin</h1>
        <p>Sign in to manage prices.</p>
        <label>Password
          <input type="password" autoFocus required autoComplete="current-password" value={pw}
            onChange={(e) => { setPw(e.target.value); if (state === "wrong") setState("idle"); }} />
        </label>
        <button className="btn btn-amber" type="submit" disabled={state === "checking" || state === "ok"}>
          {state === "ok" ? "Lights on…" : state === "checking" ? "Checking…" : "Sign in"}
        </button>
        <p className="gate-err" role="alert">{err}</p>
        <a className="gate-back" href={BASE_PATH}>← Back to the shop</a>
      </form>
    </section>
  );
}
