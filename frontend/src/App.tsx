import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "./auth/auth-context-provider";
import { useAuth } from "./auth/use-auth-hook";
import { SearchProvider } from "./contexts/SearchContext";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Callback from "./pages/Callback";
import Login from "./pages/Login";
import DocumentsWrapper from "./components/DocumentWrapper";
import Navbar from "./components/Dashboard/Navbar";
// Lazy loaded components
const ProjectList = lazy(() => import("./components/Dashboard/ProjectList"));
const QuillVersionProvider = lazy(() =>
  import("./contexts/VersionContext").then((module) => ({
    default: module.QuillVersionProvider,
  }))
);

const queryClient = new QueryClient();

function Layout({ children }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      console.log("No active session detected, attempting silent login");
      login(true);
    }
    if (isAuthenticated) {
      getToken().then((token) => {
        localStorage.setItem("access_token", token!);
      });
    }
  }, [isAuthenticated, isLoading, login, getToken]);
  return <>{children}</>;
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">Loading...</div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-[#fafbfd]">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                {isAuthenticated && (
                  <SearchProvider>
                    <Suspense fallback={<LoadingFallback />}>
                      <Navbar />
                      <ProjectList />
                    </Suspense>
                  </SearchProvider>
                )}
              </Layout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />

          <Route
            path="/documents/:id"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <QuillVersionProvider>
                  <DocumentsWrapper />
                </QuillVersionProvider>
              </Suspense>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
