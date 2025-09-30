import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Auth0ProviderWithNavigate } from "./auth/auth0-provider";
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <BrowserRouter>
    <Auth0ProviderWithNavigate>
        <App />
    </Auth0ProviderWithNavigate>
  </BrowserRouter>
);
