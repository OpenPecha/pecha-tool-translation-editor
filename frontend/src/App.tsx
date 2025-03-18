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
    <div className="p-4">
      {selectedTranslationId && (
        <SyncOptions syncMode={syncMode} setSyncMode={setSyncMode} />
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
      <div className="translation-selector px-4 bg-gray-100">
        <label htmlFor="translationSelect" className="mr-2">
          Select Translation:
        </label>
        <select
          id="translationSelect"
          value={selectedTranslationId ?? ""}
          onChange={(e) => setSelectedTranslationId(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Select a translation</option>
          {translations.map((translation: Translation) => (
            <option key={translation.id} value={translation.id}>
              {translation.identifier}
            </option>
          ))}
        </select>
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
