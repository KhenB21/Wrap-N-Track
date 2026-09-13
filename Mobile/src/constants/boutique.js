import { Platform } from "react-native";

/* Shared vocabulary and look for the customer ordering screens, mirroring the
   Website order page (Website/client/src/Pages/CustomerPOV/OrderBoutique.js and
   orderCategories.js). The category keys must match the Website's: they are the
   keys /api/available-inventory groups published products under. */

export const PACKAGING_KEY = "packaging";

export const CATEGORIES = [
  { key: "packaging", label: "Packaging", blurb: "The box itself — start here." },
  { key: "beverages", label: "Beverages", blurb: "Coffee, tea, wine and spirits." },
  { key: "food", label: "Food", blurb: "Sweets, preserves and pantry treats." },
  { key: "kitchenware", label: "Kitchenware", blurb: "Glassware and serving pieces." },
  { key: "homeDecor", label: "Home Decor", blurb: "Candles, diffusers and room scents." },
  { key: "faceAndBody", label: "Face & Body", blurb: "Soaps, balms and bath rituals." },
  { key: "clothing", label: "Clothing & Accessories", blurb: "Robes, headbands and keepsakes." },
  { key: "customization", label: "Customization", blurb: "Engraving, ribbons and personal touches." },
  { key: "others", label: "Others", blurb: "Everything else in the collection." },
];

export const STYLE_OPTIONS = [
  "Modern Romantic",
  "Bohemian Chic",
  "Classic Elegance",
  "Minimalist Modern",
  "Others",
];

export const STYLE_OTHERS = "Others";
export const STYLE_OTHERS_NOTICE =
  "One of our staff will coordinate with you about the styling and the other details of your order.";

export const MIN_LEAD_DAYS = 14; // hard block below this
export const RECOMMENDED_LEAD_DAYS = 21; // soft warning between MIN and this

export const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });

export const peso = (value) => {
  const amount = Number(value) || 0;
  const [whole, cents] = Math.abs(amount).toFixed(2).split(".");
  return `${amount < 0 ? "-" : ""}₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
};

// Light palette is the Website order page's; dark keeps the same roles on the app's dark greys.
export const getBoutiqueColors = (darkMode) =>
  darkMode
    ? {
        bg: "#18191A",
        cream: "#202122",
        surface: "#242526",
        accent: "#6B6593",
        accentText: "#A9A6CC",
        accentWash: "#2F2E3D",
        text: "#E4E6EB",
        textSoft: "#B0B3B8",
        textMute: "#8A8D91",
        border: "#393A3B",
        borderSoft: "#303132",
        wash: "#303132",
        success: "#86B893",
        danger: "#E57373",
        warnBg: "#3A3120",
        warnText: "#E3C07A",
        tagBg: "rgba(24,25,26,0.85)",
      }
    : {
        bg: "#F9F8EF",
        cream: "#F1F0E2",
        surface: "#FFFFFF",
        accent: "#6A698F",
        accentText: "#6A698F",
        accentWash: "#EEEDF4",
        text: "#33373D",
        textSoft: "#5C6066",
        textMute: "#7C8087",
        border: "#E4E2D6",
        borderSoft: "#EFEEE4",
        wash: "#EEEDF4",
        success: "#5B8266",
        danger: "#B0413E",
        warnBg: "#FBF3E0",
        warnText: "#8A6414",
        tagBg: "rgba(255,255,255,0.92)",
      };
