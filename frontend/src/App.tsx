import { Routes, Route, Navigate } from "react-router-dom";
import { QuillHistoryProvider } from "./contexts/HistoryContext";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import DocumentList from "./components/Dashboard/DocumentList";
import DocumentsWrapper from "./components/DocumentWrapper";
import { ReactNode, useEffect } from "react";
import { AuthProvider } from "./auth/auth-context-provider";
import { useAuth } from "./auth/use-auth-hook";
import Callback from "./Callback";

interface ProtectedRouteProps {
  children: ReactNode;
}

// Protected route component
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoading, isAuthenticated, currentUser } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="flex flex-col h-full bg-[#fafbfd]">
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navbar />
              <DocumentList />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/callback" element={<Callback />} />

        <Route
          path="/documents/:id"
          element={
            <ProtectedRoute>
              <QuillHistoryProvider>
                <DocumentsWrapper />
              </QuillHistoryProvider>
            </ProtectedRoute>
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
