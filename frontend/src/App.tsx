import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./auth/auth-context-provider";
import { useAuth } from "./auth/use-auth-hook";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Callback from "./pages/Callback";
import Login from "./pages/Login";
import DocumentsWrapper from "./components/DocumentWrapper";
import Navbar from "./components/Dashboard/Navbar";
import OpenPecha from "./assets/icon.png";
import TolgeeProvider, { useCurrentLanguage } from "./contexts/TolgeeContext";

const ProjectList = lazy(() => import("./components/Dashboard/ProjectList"));
const QuillVersionProvider = lazy(() =>
  import("./contexts/VersionContext").then((module) => ({
    default: module.QuillVersionProvider,
  }))
);

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      getToken().then((token) => {
        localStorage.setItem("access_token", token!);
      });
      return;
    }
    if (!isAuthenticated && !isLoading) {
      login(true);
    }
  }, [isAuthenticated, isLoading]);
  if (!isAuthenticated) return null;

  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function LoadingFallback() {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center space-x-3">
          <img
            src={OpenPecha}
            alt="OpenPecha"
            className="w-12 h-12 animate-pulse"
          />
          <h1 className="text-2xl font-semibold text-gray-500">OpenPecha</h1>
        </div>

        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-gray-100 p-4">
      <p className="text-center text-sm text-gray-500 ">
        Powered by{" "}
        <a href="https://openpecha.org/" className=" text-blue-500 ">
          <img src={OpenPecha} alt="OpenPecha" className="w-4 h-4 inline" />{" "}
          OpenPecha
        </a>
      </p>
    </div>
  );
}

function AppContent() {
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
            <Suspense fallback={<LoadingFallback />}>
              <Layout>
                <Navbar />
                <ProjectList />
                <Footer />
              </Layout>
            </Suspense>
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
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TolgeeProvider>
          <AppContent />
        </TolgeeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
