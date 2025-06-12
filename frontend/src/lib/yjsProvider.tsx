import React, { useState, useEffect, useRef, ReactNode } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness.js";
import { useAuth } from "@/auth/use-auth-hook";

interface YjsContextType {
  yjsProvider: WebsocketProvider | null;
  ydoc: Y.Doc | null;
  createYjsProvider: (docIdentifier?: string | null) => void;
  yText: Y.Text | null;
  yComments: Y.Array<any> | null;
  clearYjsProvider: () => void;
  toggleConnection: () => void;
  isSynced: boolean;
  activeUsers: any;
}

const YjsContext = React.createContext<YjsContextType>({} as YjsContextType);

const { Provider, Consumer } = YjsContext;
const CLIENT_WEBSOCKET_URL =
  import.meta.env.VITE_CLIENT_WEB_SOCKET || "ws://localhost:9000";

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
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [ydoc, setYDoc] = useState<Y.Doc | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [yComments, setYComments] = useState<Y.Array<any> | null>(null);
  const awarenessProtocol = { Awareness };
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const { currentUser } = useAuth();
  // Keep track of event listeners for cleanup
  type YjsEventHandler = (data: Record<string, unknown>) => void;

  // Cleanup function to properly handle WebSocket disconnection
  useEffect(() => {
    if (yjsProvider) {
      yjsProvider.on("sync", setIsSynced);
    }

    // Rturn cleanup function that runs when component unmounts
    return () => {
      if (yjsProvider && yjsProvider.wsconnected) {
        yjsProvider.disconnect();
        yjsProvider.off("sync", setIsSynced);
      }
    };
  }, [yjsProvider]);

  useEffect(() => {
    if (!yjsProvider?.awareness) return;

    const awareness = yjsProvider.awareness;

    const onChange = () => {
      const states = Array.from(awareness.getStates().values());
      setActiveUsers(states);
    };

    awareness.on("change", onChange);

    // Initial load
    onChange();

    return () => {
      awareness.off("change", onChange);
    };
  }, [yjsProvider?.awareness]);

  const createYjsProvider = (docIdentifier: string | null = null) => {
    // First clean up any existing provider to prevent memory leaks
    if (yjsProvider) {
      clearYjsProvider();
    }

    let identifier = docIdentifier;
    // Always create a new Y.Doc instance to prevent reuse issues
    const ydocInstance = new Y.Doc({
      gc: true,
      gcFilter: () => true,
      meta: {
        identifier,
      },
    });
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
        name: currentUser?.name ?? "Anonymous User",
        id: Math.floor(Math.random() * 100000),
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      },
      cursor: {},
      selection: null,
    });

    // Track pending async operations to prevent race conditions
    const pendingOperations = new Set<string>();

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
        resyncInterval: 10000,
        WebSocketPolyfill: WebSocket,
        maxBackoffTime: 10000,
        disableBc: true,
      }
    );

    // Ensure proper binary type for WebSocket
    if (provider.ws) {
      provider.ws.binaryType = "arraybuffer";

      // Original onmessage handler
      const originalOnMessage = provider.ws.onmessage;

      // Add custom error handling for WebSocket
      provider.ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        // Try to reconnect on error after a delay
        setTimeout(() => {
          if (provider && !provider.wsconnected) {
            provider.connect();
          }
        }, 3000);
      };

      // Add custom onclose handler
      provider.ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        // Clear pending operations on connection close
        pendingOperations.clear();
      };

      // Override onmessage to handle asynchronous operations
      provider.ws.onmessage = async (event) => {
        try {
          // Generate a unique ID for this message
          const opId = `op-${Date.now()}-${Math.random()}`;
          pendingOperations.add(opId);

          // Process the message
          if (originalOnMessage) {
            originalOnMessage.call(provider.ws, event);
          }

          // Remove the operation ID after processing
          pendingOperations.delete(opId);
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
          // Remove potential pending operations
          pendingOperations.clear();
        }
      };
    }

    // Add additional event listeners to provider
    provider.on("status", (event: { status: string }) => {
      console.log("WebSocket status changed:", event.status);
    });

    // Register this provider in the global tracking array
    if (!window.yjsWebsocketInstances) {
      window.yjsWebsocketInstances = [];
    }
    window.yjsWebsocketInstances.push(provider);

    setYjsProvider(provider);
  };

  const clearYjsProvider = () => {
    if (yjsProvider) {
      try {
        // Wait for any pending async operations to complete before disconnecting
        setTimeout(() => {
          try {
            // Remove awareness states and disconnect cleanly
            if (yjsProvider.awareness) {
              yjsProvider.awareness.setLocalState(null);
              yjsProvider.awareness.destroy();
            }

            // Disconnect WebSocket if connected
            if (yjsProvider.wsconnected) {
              yjsProvider.disconnect();
            }

            // Clear any custom handlers we may have added
            if (yjsProvider.ws) {
              yjsProvider.ws.onmessage = null;
              yjsProvider.ws.onerror = null;
              yjsProvider.ws.onclose = null;
            }

            // Remove this provider from the global tracking array
            if (window.yjsWebsocketInstances) {
              window.yjsWebsocketInstances =
                window.yjsWebsocketInstances.filter((p) => p !== yjsProvider);
            }
          } catch (err) {
            console.error("Error cleaning up YJS provider:", err);
          }
        }, 200); // Give pending operations a chance to complete
      } catch (err) {
        console.error("Error in delayed cleanup:", err);
      }
    }

    // Destroy Y.Doc to free memory
    if (ydoc) {
      try {
        ydoc.destroy();
      } catch (err) {
        console.error("Error destroying Y.Doc:", err);
      }
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
        activeUsers,
        isSynced: isSynced,
      }}
    >
      {children}
    </Provider>
  );
};

export { Consumer as YjsConsumer, YjsProvider, withYjs };

export default YjsContext;
