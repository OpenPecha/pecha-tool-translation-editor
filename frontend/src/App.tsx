import { Routes, Route, Navigate } from "react-router-dom";
import { QuillHistoryProvider } from "./contexts/HistoryContext";
import DocumentList from "./components/Dashboard/DocumentList";
import DocumentsWrapper from "./components/DocumentWrapper";
import { AuthProvider } from "./auth/auth-context-provider";
import Login from "./pages/Login";
import { useAuth } from "./auth/use-auth-hook";
import Callback from "./pages/Callback";
import { useEffect } from "react";
import Navbar from "./components/Dashboard/Navbar";

function Layout({ children }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();
  useEffect(() => {
    // Only attempt silent login if not already authenticated and not currently loading
    if (!isAuthenticated && !isLoading) {
      console.log("No active session detected, attempting silent login");
      login(true); // This wil
      // l attempt silent login once
    }
    if (isAuthenticated) {
      getToken().then((token) => {
        localStorage.setItem("access_token", token!);
      });
    }
  }, [isAuthenticated, isLoading, login, getToken]);
  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  // Try silent login on app initialization if not authenticated

  return (
    <div className="flex flex-col h-full bg-[#fafbfd]">
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              {isAuthenticated && (
                <>
                  <Navbar />
                  <DocumentList />
                </>
              )}
            </Layout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />

        <Route
          path="/documents/:id"
          element={
            <QuillHistoryProvider>
              <DocumentsWrapper />
            </QuillHistoryProvider>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
