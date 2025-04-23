import React, { ReactNode } from "react";
import { Auth0Provider } from "@auth0/auth0-react";

interface Auth0ProviderWithNavigateProps {
  children: ReactNode;
}

export const Auth0ProviderWithNavigate: React.FC<
  Auth0ProviderWithNavigateProps
> = ({ children }) => {
  const redirectUri =
    import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin;

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: "openid profile email",
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        prompt: "none",
      }}
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};
