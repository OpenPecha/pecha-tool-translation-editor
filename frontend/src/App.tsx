import { Routes, Route, Navigate, useParams } from 'react-router-dom';
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
        <div className="home-wrapper">
          <Routes>
          <Route 
              path="/" 
              element={
                <ProtectedRoute>
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
                  <EditorWrapper/>
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
  

  function  EditorWrapper(){
    const { id } = useParams();
    return (
      <div className='flex'>
      <YjsProvider >
        <DocumentEditor docId={id}/>
      </YjsProvider>
      {/* <YjsProvider >
        <DocumentEditor docId={"aa0ed610-0fa4-4f5f-96d4-16b100fe6b31-1"}/>
      </YjsProvider > */}
      </div>
    )
  }
  export default App;