import React, { ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react";

interface Auth0ProviderWithNavigateProps {
  children: ReactNode;
}

export const Auth0ProviderWithNavigate: React.FC<
  Auth0ProviderWithNavigateProps
> = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN || "";
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "";
  const redirectUri =
    import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin;

  if (!domain || !clientId) {
    console.warn("Auth0 domain or client ID not configured");
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: "openid profile email",
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};
