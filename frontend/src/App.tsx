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
import Quill from "quill";
import useScrollHook from "./hooks/useScrollHook";
import SyncOptions from "./components/SyncOptions";

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
  const { syncMode, setSyncMode } = useScrollHook(quill1Ref, quill2Ref);
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
        <div className="absolute bottom-0 right-0 bg-gray-100 z-40">
          <SyncOptions syncMode={syncMode} setSyncMode={setSyncMode} />
        </div>
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
  // const [selectedTranslationId, setSelectedTranslationId] = useState<
  //   string | null
  // >(null);
  const isTranslationAvailable = translations.length > 0;

  if (!isTranslationAvailable) return null;
  if (!selectedTranslationId)
    return (
      <div className="w-[20vw] bg-gray-100">
        <h3 className="text-lg font-semibold mb-4 px-4 py-2 bg-gray-300 text-gray-700">
          Select a Translation
        </h3>
        <div className="px-4">
          {translations.map((translation: Translation) => (
            <button
              key={translation.id}
              onClick={() => setSelectedTranslationId(translation.id)}
              className="w-full cursor-pointer text-left p-2 border rounded mt-4 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    <div className="flex w-full flex-1 flex-col">
      {/* <button onClick={() => setSelectedTranslationId(null)}>close Translation</button> */}
      <YjsProvider key={selectedTranslationId}>
        <DocumentEditor docId={selectedTranslationId} editorRef={editorRef} />
      </YjsProvider>
    </div>
  );
}

export default App;
