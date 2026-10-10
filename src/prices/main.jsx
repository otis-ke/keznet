import { createRoot } from "react-dom/client";
import Gate from "./Gate.jsx";
import Prices from "./Prices.jsx";
import "../styles/style.css";
import "../styles/prices.css";

createRoot(document.getElementById("root")).render(
  <Gate>{(logout) => <Prices onLogout={logout} />}</Gate>
);
