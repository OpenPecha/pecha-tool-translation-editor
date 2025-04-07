import { Routes, Route, Navigate, redirect } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { QuillHistoryProvider } from "./contexts/HistoryContext";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import DocumentList from "./components/Dashboard/DocumentList";
import DocumentsWrapper from "./components/DocumentWrapper";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

// Protected route component
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const auth = useAuth();
  if (auth?.loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!auth?.currentUser) {
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
