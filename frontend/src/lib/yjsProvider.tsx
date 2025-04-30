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
  online: boolean;
}

const YjsContext = React.createContext<YjsContextType>({} as YjsContextType);

const { Provider, Consumer } = YjsContext;
const CLIENT_WEBSOCKET_URL =
  import.meta.env.VITE_CLIENT_WEB_SOCKET || "ws://localhost:8000";

// Initialize global tracking for WebSocket instances
if (typeof window !== 'undefined' && !window.yjsWebsocketInstances) {
  window.yjsWebsocketInstances = [];
}

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
}

const YjsProvider = ({ children }: YjsProviderProps) => {
  const [yjsProvider, setYjsProvider] = useState<WebsocketProvider | null>(
    null
  );
  const [ydoc, setYDoc] = useState<Y.Doc | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [yComments, setYComments] = useState<Y.Array<any> | null>(null);
  const [online, setOnline] = useState<boolean>(true);
  const awarenessProtocol = { Awareness };

  // Keep track of event listeners for cleanup
  type YjsEventHandler = (data: Record<string, unknown>) => void;
  const eventListenersRef = useRef<{[key: string]: YjsEventHandler[]}>({});

  // Cleanup function to properly handle WebSocket disconnection
  useEffect(() => {
    // Return cleanup function that runs when component unmounts
    return () => {
      if (yjsProvider) {
        console.log('Cleaning up YjsProvider on unmount');
        
        // Remove all registered event listeners
        if (eventListenersRef.current) {
          Object.keys(eventListenersRef.current).forEach(eventName => {
            const typedEventName = eventName as "sync" | "status" | "connection-close" | "connection-error";
            eventListenersRef.current[eventName].forEach(listener => {
              yjsProvider.off(typedEventName, listener);
            });
          });
        }
        
        // Disconnect WebSocket if connected
        if (yjsProvider.wsconnected) {
          console.log('Disconnecting WebSocket');
          yjsProvider.disconnect();
        }
        
        // Remove from global tracking
        if (window.yjsWebsocketInstances) {
          window.yjsWebsocketInstances = window.yjsWebsocketInstances.filter(
            provider => provider !== yjsProvider
          );
        }
      }
      
      // Destroy Y.Doc to free memory
      if (ydoc) {
        console.log('Destroying Y.Doc');
        ydoc.destroy();
      }
    };
  }, [yjsProvider, ydoc]);

  // Helper function to register event listeners for cleanup
  const registerEventListener = (
    provider: WebsocketProvider, 
    eventName: "sync" | "status" | "connection-close" | "connection-error", 
    listener: YjsEventHandler
  ) => {
    if (!eventListenersRef.current[eventName]) {
      eventListenersRef.current[eventName] = [];
    }
    eventListenersRef.current[eventName].push(listener);
    provider.on(eventName, listener);
  };

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
        params: { token: localStorage.getItem("access_token") ?? "" },
        WebSocketPolyfill: WebSocket,
        resyncInterval: 4000,
        awareness: awareness,
      }
    );

    // Add this provider to global tracking for cleanup
    if (window.yjsWebsocketInstances) {
      window.yjsWebsocketInstances.push(provider);
    }

    // Set up event listeners for WebSocket connection with tracking for cleanup
    const statusListener = ({ status }: { status: string }) => {
      console.log("Connection status:", status);

      // When connected, ensure awareness state is set
      if (status === "connected") {
        awareness.setLocalState({
          user: {
            name: localStorage.getItem("username") ?? "Anonymous User",
            id: Math.floor(Math.random() * 100000),
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          },
          cursor: {},
          selection: null,
        });
      }
    };
    
    // Register event listener for cleanup tracking
    registerEventListener(provider, "status", statusListener as YjsEventHandler);
    
    console.log(`Created new YjsProvider for document: ${identifier}`);
    setYjsProvider(provider);
  };

  const clearYjsProvider = () => {
    console.log('Manually clearing YjsProvider');
    
    if (yjsProvider) {
      // Remove all registered event listeners
      if (eventListenersRef.current) {
        Object.keys(eventListenersRef.current).forEach(eventName => {
          const typedEventName = eventName as "sync" | "status" | "connection-close" | "connection-error";
          eventListenersRef.current[eventName].forEach(listener => {
            yjsProvider.off(typedEventName, listener);
          });
        });
      }
      
      // Reset event listeners tracking
      eventListenersRef.current = {};
      
      // Disconnect WebSocket if connected
      if (yjsProvider.wsconnected) {
        console.log('Disconnecting WebSocket');
        yjsProvider.disconnect();
      }
      
      // Remove from global tracking
      if (window.yjsWebsocketInstances) {
        window.yjsWebsocketInstances = window.yjsWebsocketInstances.filter(
          provider => provider !== yjsProvider
        );
      }
    }
    
    // Destroy Y.Doc to free memory
    if (ydoc) {
      console.log('Destroying Y.Doc');
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
      setOnline(false);
    } else {
      yjsProvider.connect();
      setOnline(true);
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
        online,
      }}
    >
      {children}
    </Provider>
  );
};

export { Consumer as YjsConsumer, YjsProvider, withYjs };

export default YjsContext;
