import { Routes, Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AuthProvider } from "./auth/auth-context-provider";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Callback from "./pages/Callback";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import DocumentsWrapper from "./components/DocumentWrapper";
import TolgeeProvider, { useCurrentLanguage } from "./contexts/TolgeeContext";
import Documentation from "./documentation/Documentation";
import PublicDocumentViewer from "./components/PublicDocumentViewer";
import { injectUmami } from "./analytics";
import { Layout, SuspenceWithLoadingFallback } from "./pages/layout";
import { UserbackProvider } from "./contexts/UserbackProvider";
const ProjectList = lazy(() => import("./components/Dashboard/ProjectList"));
const QuillVersionProvider = lazy(() =>
  import("./contexts/VersionContext").then((module) => ({
    default: module.QuillVersionProvider,
  }))
);

if (import.meta.env.VITE_ENVIRONMENT === "production") {
  injectUmami();
}

const queryClient = new QueryClient();





function AppContent() {
  const currentLanguage = useCurrentLanguage();
  return (
    <div
      className={`flex s flex-col h-full ${currentLanguage === "bo" && "font-monlam-2 !text-md"
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
    </TolgeeProvider>
  );
}

export default App;
