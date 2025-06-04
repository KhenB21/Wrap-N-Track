import { Platform } from "react-native";

// Detect dev environment
const isDev =
  typeof __DEV__ !== "undefined" && __DEV__; // React Native
// or if in a Web context (optional fallback):
// typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const LOCAL_IP = "192.168.100.34"; // Replace with your machine's local IP

const config = {
  API_URL: isDev
    ? Platform.OS === "web"
      ? "http://localhost:3002"
      : `http://${LOCAL_IP}:3002`
    : process.env.REACT_APP_API_URL || "https://wrap-n-track.onrender.com",

  WS_URL: isDev
    ? Platform.OS === "web"
      ? "ws://localhost:3002"
      : `ws://${LOCAL_IP}:3002`
    : process.env.REACT_APP_WS_URL || "wss://wrap-n-track.onrender.com",

  isDev,
};

console.log("App Config:", config);

export default config;
