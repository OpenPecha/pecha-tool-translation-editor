import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import { YjsProvider } from './lib/yjsProvider';
// Protected route component
const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
  
    if (loading) {
      return <div className="loading">Loading...</div>;
    }
  
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
  
    return children;
  };
  
  function AppContent() {
    return (
      <div className="app">
        <Navbar />
        <div className="container">
          <Routes>

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <DocumentList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents/:id" 
              element={
                <ProtectedRoute>
                  <YjsProvider>
                  <DocumentEditor />
                  </YjsProvider>
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

        </div>
      </div>
    );
  }
  
  function App() {
    return <AuthProvider>
      <AppContent />
    </AuthProvider> 
  }
  
  export default App;