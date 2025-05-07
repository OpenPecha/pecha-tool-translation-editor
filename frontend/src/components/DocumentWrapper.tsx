import { useState, useEffect, useRef } from "react";

import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { EditorProvider } from "@/contexts/EditorContext";
import { useParams } from "react-router-dom";
import DocumentEditor from "./DocumentEditor";
import { YjsProvider } from "../lib/yjsProvider";
import SideMenu from "./EditorSideMenu/Sidemenu";
import { ChevronRight } from "lucide-react";
import MenuDrawer from "./MenuDrawer";
import Navbar from "./Navbar";
import { useDevToolsStatus } from "@/hooks/useDevToolStatus";

export interface Translation {
  id: string;
  identifier: string;
  language: string;
}

function DocumentsWrapper() {
  const { id } = useParams();
  useDevToolsStatus();

  const { currentDoc, loading, error, isEditable } = useCurrentDoc(id);
  const previousIdRef = useRef<string | null>(null);
  const [selectedTranslationId, setSelectedTranslationId] = useState<
    string | null
  >(null);

  // Track previous translation ID for cleanup
  const previousTranslationIdRef = useRef<string | null>(null);

  // Use useEffect to properly clean up WebSocket connections when component unmounts or document changes
  useEffect(() => {
    // Store the current ID for comparison on next render
    const previousId = previousIdRef.current;
    previousIdRef.current = id ?? null;

    // If ID changed (not first render), clean up previous connections
    if (previousId && previousId !== id) {
      cleanupWebSocketConnections(previousId);
    }

    // This will run when the component unmounts
    return () => {
      // Force cleanup of any lingering WebSocket connections
      cleanupAllWebSocketConnections();
    };
  }, [id]);

  // Function to clean up all WebSocket connections
  const cleanupAllWebSocketConnections = () => {
    if (
      window.yjsWebsocketInstances &&
      window.yjsWebsocketInstances.length > 0
    ) {
      window.yjsWebsocketInstances.forEach((provider) => {
        if (provider && provider.wsconnected) {
          provider.disconnect();
        }
      });
      // Clear the instances array
      window.yjsWebsocketInstances = [];
    }
  };

  // Function to clean up WebSocket connections for a specific document
  const cleanupWebSocketConnections = (documentId: string) => {
    if (
      window.yjsWebsocketInstances &&
      window.yjsWebsocketInstances.length > 0
    ) {
      // Find providers associated with this document ID
      const providersToRemove = window.yjsWebsocketInstances.filter(
        (provider) => provider.roomname === documentId
      );

      if (providersToRemove.length > 0) {
        providersToRemove.forEach((provider) => {
          if (provider.wsconnected) {
            provider.disconnect();
          }
        });

        // Update the global tracking array
        window.yjsWebsocketInstances = window.yjsWebsocketInstances.filter(
          (provider) => provider.roomname !== documentId
        );
      }
    }
  };

  // Handle translation selection with proper cleanup
  const handleSelectTranslation = (translationId: string | null) => {
    // Store the current translation ID for cleanup
    const previousTranslationId = previousTranslationIdRef.current;
    previousTranslationIdRef.current = translationId;

    // Clean up previous translation provider if exists
    if (previousTranslationId) {
      cleanupWebSocketConnections(previousTranslationId);
    }

    setSelectedTranslationId(translationId);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <EditorProvider>
      <Navbar title={currentDoc?.name} />
      {selectedTranslationId && (
        <MenuDrawer rootId={id!} translationId={selectedTranslationId} />
      )}
      <div id="toolbar-container"></div>
      <div className="relative flex px-2  h-[calc(100dvh-110px)] w-full">
        <YjsProvider key={id}>
          <DocumentEditor docId={id} isEditable={isEditable} />
        </YjsProvider>

        {!selectedTranslationId ? (
          <SideMenu setSelectedTranslationId={handleSelectTranslation} />
        ) : (
          <YjsProvider key={selectedTranslationId}>
            <DocumentEditor
              docId={selectedTranslationId}
              isEditable={isEditable}
            />
          </YjsProvider>
        )}

        {selectedTranslationId && (
          <div className="relative">
            <button
              onClick={() => handleSelectTranslation(null)}
              className="absolute right-2 top-2 z-10 rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
              aria-label="Close translation view"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </EditorProvider>
  );
}

export default DocumentsWrapper;
