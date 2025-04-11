import { Routes, Route, Navigate } from "react-router-dom";
import { QuillHistoryProvider } from "./contexts/HistoryContext";
import Navbar from "./components/Navbar";
import DocumentList from "./components/Dashboard/DocumentList";
import DocumentsWrapper from "./components/DocumentWrapper";
import { AuthProvider } from "./auth/auth-context-provider";
import Login from "./pages/Login";
import { useAuth } from "./auth/use-auth-hook";
import Callback from "./pages/Callback";
import { useEffect } from "react";
import LoginComponent from "./components/LoginComponent";

function AppContent() {
  const { isAuthenticated, getToken } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      getToken().then((token) => {
        localStorage.setItem("access_token", token!);
      });
    }
  }, [isAuthenticated, getToken]);
  return (
    <div className="flex flex-col h-full bg-[#fafbfd]">
      <Routes>
        <Route
          path="/"
          element={
            <>
              {isAuthenticated ? (
                <>
                  <Navbar />
                  <DocumentList />
                </>
              ) : (
                <LoginComponent />
              )}
            </>
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
