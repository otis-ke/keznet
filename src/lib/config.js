// Luminance configuration.
//
// Luminance shows the same products and photos as the main catalogue, which it
// READS ONLY from /otishub in the shared Firebase Realtime Database. It never
// writes there: names, descriptions and photos can't be changed from this site.
//
// Its own prices are stored separately under /luminance/prices/<productId>.
// Products without a Luminance price show the catalogue's price (or "Ask for price").
//
// The Firebase web config below is not a secret: browser apps always ship it.

export const firebaseConfig = {
  apiKey: "AIzaSyAUYAB6G3ZW9F-KWgsMLQeUc2SPaw8h93M",
  authDomain: "posjl-b49ce.firebaseapp.com",
  databaseURL: "https://posjl-b49ce-default-rtdb.firebaseio.com",
  projectId: "posjl-b49ce",
  storageBucket: "posjl-b49ce.firebasestorage.app",
  messagingSenderId: "624369028287",
  appId: "1:624369028287:web:d650c36385899f26490a0a"
};

export const SITE_NAME = "Luminance";

export const CATALOG_ROOT = "otishub";    // read-only: /otishub/products, /otishub/categories
export const CATALOG_SITE_ID = "otis-hub"; // records in the shared catalogue carry this tag
export const PRICES_ROOT = "luminance";    // Luminance's own data: /luminance/prices

// SHA-256 hashes of the admin password for the Prices page (only the hashes are stored, never the password).
// To change it: node -e "console.log(require('crypto').createHash('sha256').update('NEW-PASSWORD').digest('hex'))"
export const ADMIN_PASS_SHA256 = [
  "d83bc399f41ef751aaa752b1de64e189a627b61ed278c5ba29fb13218794f443",
  "c82b4fc1d1139ec4bfb8386c6a04919311399a6f3af474b2409df34124aea965",
];

// International format, no "+" or leading 0  (0721672190 -> 254721672190)
export const WHATSAPP = "254721672190";
export const WHATSAPP_DISPLAY = "0721 672 190";
export const CURRENCY = "KES";
