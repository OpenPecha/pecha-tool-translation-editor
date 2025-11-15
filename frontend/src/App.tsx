import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import DocumentsWrapper from "./components/DocumentWrapper";
import PublicDocumentViewer from "./components/PublicDocumentViewer";
import { UserbackProvider } from "./contexts/UserbackProvider";
import Documentation from "./documentation/Documentation";
import Callback from "./pages/Callback";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import { Layout, SuspenceWithLoadingFallback } from "./pages/layout";
import { AuthProvider } from "./auth/AuthProvider";
import { TooltipProvider } from "./components/ui/tooltip";
import "./i18n";
import { useTranslation } from "react-i18next";
import { EditorProvider } from "./contexts/EditorContext";

const ProjectList = lazy(() => import("./components/Dashboard/ProjectList"));
const QuillVersionProvider = lazy(() =>
  import("./contexts/VersionContext").then((module) => ({
    default: module.QuillVersionProvider,
  }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60, // 1 hour
    },
  },
});

function AppContent() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

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
                <EditorProvider>
                <DocumentsWrapper />
                </EditorProvider>
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserbackProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </UserbackProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
