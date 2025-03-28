import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import DocumentList from "./components/DocumentList";
import DocumentEditor from "./components/DocumentEditor";
import { YjsProvider } from "./lib/yjsProvider";
import { useCurrentDoc } from "./hooks/useCurrentDoc";
import { useState, useMemo, useRef } from "react";

import MenuDrawer from "./components/MenuDrawer";
import { Button } from "./components/ui/button";

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
    <div className="flex flex-col h-full bg-[#fafbfd]">
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
    <>
      {selectedTranslationId && (
        <MenuDrawer quill1Ref={quill1Ref} quill2Ref={quill2Ref} />
      )}
      <div id="toolbar-container"></div>
      <div className="flex px-2  h-[calc(100dvh-52px)]">
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
    </>
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
      <div className=" mt-3 bg-gray-50 shadow-lg rounded-lg overflow-hidden">
        <h3 className="text-xl font-bold px-6 py-4 bg-gray-100 text-gray-800 border-b border-gray-200">
          Select a Translation
        </h3>
        <div className=" p-2">
          {translations.map((translation: Translation) => (
            <Button
              key={translation.id}
              onClick={() => setSelectedTranslationId(translation.id)}
              type="button"
              className="cursor-pointer"
              aria-label={`Select translation ${translation.identifier}`}
            >
              {translation.identifier}
            </Button>
          ))}
        </div>
      </div>
    );
  return (
    <YjsProvider key={selectedTranslationId}>
      <DocumentEditor docId={selectedTranslationId} editorRef={editorRef} />
    </YjsProvider>
  );
}

export default App;
