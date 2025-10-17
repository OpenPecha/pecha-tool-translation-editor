import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, useEffect } from "react";
import ReactGA from "react-ga4";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { injectUmami } from "./analytics";
import { AuthProvider } from "./auth/auth-context-provider";
import DocumentsWrapper from "./components/DocumentWrapper";
import PublicDocumentViewer from "./components/PublicDocumentViewer";
import TolgeeProvider, { useCurrentLanguage } from "./contexts/TolgeeContext";
import { UserbackProvider } from "./contexts/UserbackProvider";
import Documentation from "./documentation/Documentation";
import Callback from "./pages/Callback";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import { Layout, SuspenceWithLoadingFallback } from "./pages/layout";

const ProjectList = lazy(() => import("./components/Dashboard/ProjectList"));
const QuillVersionProvider = lazy(() =>
  import("./contexts/VersionContext").then((module) => ({
    default: module.QuillVersionProvider,
  }))
);

if (import.meta.env.VITE_ENVIRONMENT === "production") {
  injectUmami();
}
ReactGA.initialize("G-CM51E2KXSB");
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60, // 1 hour
    },
  },
});

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
    });
  }, [location]);
  const currentLanguage = useCurrentLanguage();
  return (
    <div
      className={`flex s flex-col h-full ${
        currentLanguage === "bo" && "font-monlam-2 !text-md"
      }`}
    >
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <ProjectList />
            </Layout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/callback" element={<Callback />} />

        <Route
          path="/documents/public/:id"
          element={
            <SuspenceWithLoadingFallback>
              <PublicDocumentViewer />
            </SuspenceWithLoadingFallback>
          }
        />

        <Route
          path="/documents/:id"
          element={
            <SuspenceWithLoadingFallback>
              <QuillVersionProvider>
                <DocumentsWrapper />
              </QuillVersionProvider>
            </SuspenceWithLoadingFallback>
          }
        />
        <Route path="/help" element={<Documentation />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <TolgeeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserbackProvider>
            <AppContent />
          </UserbackProvider>
        </AuthProvider>
      </QueryClientProvider>
      <Toaster />
    </TolgeeProvider>
  );
}

export default App;
