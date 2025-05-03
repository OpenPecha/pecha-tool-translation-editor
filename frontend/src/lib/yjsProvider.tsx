import React, { useState, useEffect, useRef, ReactNode } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness.js";

interface YjsContextType {
  yjsProvider: WebsocketProvider | null;
  ydoc: Y.Doc | null;
  createYjsProvider: (docIdentifier?: string | null) => void;
  yText: Y.Text | null;
  yComments: Y.Array<any> | null;
  clearYjsProvider: () => void;
  toggleConnection: () => void;
  isSynced: boolean;
}

const YjsContext = React.createContext<YjsContextType>({} as YjsContextType);

const { Provider, Consumer } = YjsContext;
const CLIENT_WEBSOCKET_URL =
  import.meta.env.VITE_CLIENT_WEB_SOCKET || "ws://localhost:8000";

const withYjs = <P extends object>(
  Component: React.ComponentType<P & YjsContextType>
) => {
  const C = (props: P) => (
    <Consumer>
      {(providerProps: YjsContextType) => (
        <Component {...providerProps} {...props} />
      )}
    </Consumer>
  );
  return C;
};

interface YjsProviderProps {
  children: ReactNode;
  onDocumentReady?: (doc: Y.Doc) => void;
}

const YjsProvider = ({ children }: YjsProviderProps) => {
  const [yjsProvider, setYjsProvider] = useState<WebsocketProvider | null>(
    null
  );
  const [ydoc, setYDoc] = useState<Y.Doc | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [yComments, setYComments] = useState<Y.Array<any> | null>(null);
  const awarenessProtocol = { Awareness };
  const [isSynced, setIsSynced] = useState<boolean>(false);
  // Keep track of event listeners for cleanup
  type YjsEventHandler = (data: Record<string, unknown>) => void;

  // Cleanup function to properly handle WebSocket disconnection
  useEffect(() => {
    if (yjsProvider) {
      yjsProvider.on("sync", setIsSynced);
    }

    // Return cleanup function that runs when component unmounts
    return () => {
      if (yjsProvider && yjsProvider.wsconnected) {
        yjsProvider.disconnect();
        yjsProvider.off("sync", setIsSynced);
      }

      // Destroy Y.Doc to free memory
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [yjsProvider, ydoc]);

  const createYjsProvider = (docIdentifier: string | null = null) => {
    // First clean up any existing provider to prevent memory leaks
    if (yjsProvider) {
      clearYjsProvider();
    }

    let identifier = docIdentifier;

    // Always create a new Y.Doc instance to prevent reuse issues
    const ydocInstance = new Y.Doc();
    setYDoc(ydocInstance);

    if (!identifier) {
      identifier = Array.from(Array(20), () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join("");
      window.history.replaceState({}, identifier, `/${identifier}`);
    }

    // Create text instance with the document identifier
    const yTextInstance = ydocInstance.getText(identifier);
    setYText(yTextInstance);

    // Create a shared Y.js Array for storing comments
    const yCommentsInstance = ydocInstance.getArray("comments");
    setYComments(yCommentsInstance);

    const awareness = new awarenessProtocol.Awareness(ydocInstance);

    // Set up initial awareness state with user information
    awareness.setLocalState({
      user: {
        name: localStorage.getItem("username") || "Anonymous User",
        id: Math.floor(Math.random() * 100000),
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      },
      cursor: {},
      selection: null,
    });

    // Create WebSocket provider with proper configuration
    const provider = new WebsocketProvider(
      CLIENT_WEBSOCKET_URL,
      identifier,
      ydocInstance,
      {
        params: {
          token: localStorage.getItem("access_token") ?? "",
        },
        awareness: awareness,
        connect: true,
        resyncInterval: 3000,
        WebSocketPolyfill: WebSocket,
      }
    );

    // Ensure proper binary type for WebSocket
    if (provider.ws) {
      provider.ws.binaryType = "arraybuffer";
    }

    setYjsProvider(provider);
  };

  const clearYjsProvider = () => {
    if (yjsProvider) {
      // Disconnect WebSocket if connected
      if (yjsProvider.wsconnected) {
        yjsProvider.disconnect();
      }
    }

    // Destroy Y.Doc to free memory
    if (ydoc) {
      ydoc.destroy();
    }

    // Reset state
    setYjsProvider(null);
    setYDoc(null);
    setYText(null);
    setYComments(null);
  };

  const toggleConnection = () => {
    if (!yjsProvider) return;
    if (yjsProvider.wsconnected) {
      yjsProvider.disconnect();
    } else {
      yjsProvider.connect();
    }
  };

  return (
    <Provider
      value={{
        yjsProvider,
        ydoc,
        createYjsProvider,
        yText,
        yComments,
        clearYjsProvider,
        toggleConnection,
        isSynced,
      }}
    >
      {children}
    </Provider>
  );
};

export { Consumer as YjsConsumer, YjsProvider, withYjs };

export default YjsContext;
