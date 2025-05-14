import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Auth0ProviderWithNavigate } from "./auth/auth0-provider";

const root = ReactDOM.createRoot(document.getElementById("root"));

// if (import.meta.env.MODE === "development") {
//   const script = document.createElement("script");
//   script.src = "//unpkg.com/react-scan/dist/auto.global.js";
//   script.async = true;
//   document.body.appendChild(script);
// }

root.render(
  <BrowserRouter>
    <Auth0ProviderWithNavigate>
      <App />
    </Auth0ProviderWithNavigate>
  </BrowserRouter>
);
