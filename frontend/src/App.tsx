import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import DocumentList from "./components/DocumentList";
import DocumentEditor from "./components/DocumentEditor";
import { YjsProvider } from "./lib/yjsProvider";
import { useCurrentDoc } from "./hooks/useCurrentDoc";
import { useState, useEffect, useMemo, useRef } from "react";
import useScrollHook from "./hooks/useScrollHook";

import MenuDrawer from "./components/MenuDrawer";

interface Translation {
  id: string;
  identifier: string;
}

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
              <EditorWrapper />
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

function EditorWrapper() {
  const { id } = useParams();
  const { currentDoc, loading, error } = useCurrentDoc(id);
  const translations = useMemo(
    () => currentDoc?.translations ?? [],
    [currentDoc?.translations]
  );
  const quill1Ref = useRef<HTMLDivElement>(null);
  const quill2Ref = useRef<HTMLDivElement>(null);

  const [selectedTranslationId, setSelectedTranslationId] = useState<
    string | null
  >(null);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }
  return (
    <div className="px-4">
      {selectedTranslationId && (
        <MenuDrawer quill1Ref={quill1Ref} quill2Ref={quill2Ref} />
      )}
      <div className="flex">
        <YjsProvider>
          <DocumentEditor docId={id} editorRef={quill1Ref} />
        </YjsProvider>
        <RenderTranslationEditor
          translations={translations}
          editorRef={quill2Ref}
          selectedTranslationId={selectedTranslationId}
          setSelectedTranslationId={setSelectedTranslationId}
        />
      </div>
    </div>
  );
}

function RenderTranslationEditor({
  translations,
  editorRef,
  selectedTranslationId,
  setSelectedTranslationId,
}: {
  translations: Translation[];
  editorRef: React.RefObject<HTMLDivElement>;
  selectedTranslationId: string | null;
  setSelectedTranslationId: (id: string) => void;
}) {
  const isTranslationAvailable = translations.length > 0;

  if (!isTranslationAvailable) return null;
  if (!selectedTranslationId)
    return (
      <div className="w-[20vw] bg-gray-50 shadow-lg rounded-lg overflow-hidden">
        <h3 className="text-xl font-bold px-6 py-4 bg-gray-100 text-gray-800 border-b border-gray-200">
          Select a Translation
        </h3>
        <div className="p-6 space-y-3">
          {translations.map((translation: Translation) => (
            <button
              key={translation.id}
              onClick={() => setSelectedTranslationId(translation.id)}
              className="w-full text-left px-4 py-3 rounded-lg transition-colors duration-200
                bg-white hover:bg-gray-50 border border-gray-200 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                shadow-sm hover:shadow
                text-gray-700 hover:text-gray-900"
              type="button"
              aria-label={`Select translation ${translation.identifier}`}
            >
              {translation.identifier}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div className="flex w-full flex-1 flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      <YjsProvider key={selectedTranslationId}>
        <DocumentEditor docId={selectedTranslationId} editorRef={editorRef} />
      </YjsProvider>
    </div>
  );
}

export default App;
