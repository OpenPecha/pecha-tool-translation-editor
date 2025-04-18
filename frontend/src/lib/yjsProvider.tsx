import React, { useState, ReactNode } from "react";
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
  import.meta.env.VITE_CLIENT_WEB_SOCKET || "ws://localhost:1234";

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
  const [yComments, setYComments] = useState<Y.Array<any> | null>(null); // NEW: Comments storage
  const [online, setOnline] = useState<boolean>(true);
  const awarenessProtocol = { Awareness };

  const createYjsProvider = (docIdentifier: string | null = null) => {
    let identifier = docIdentifier;
    let ydocInstance = ydoc;

    if (!ydocInstance) {
      ydocInstance = new Y.Doc();
      setYDoc(ydocInstance);
    }

    const yTextInstance = ydocInstance.getText(docIdentifier || "");
    setYText(yTextInstance);

    // NEW: Create a shared Y.js Array for storing comments
    const yCommentsInstance = ydocInstance.getArray("comments");
    setYComments(yCommentsInstance);

    if (!identifier) {
      identifier = Array.from(Array(20), () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join("");
      window.history.replaceState({}, identifier, `/${identifier}`);
    }

    const provider = new WebsocketProvider(
      CLIENT_WEBSOCKET_URL,
      identifier,
      ydocInstance,
      {
        params: { token: localStorage.getItem("token") || "" },
        WebSocketPolyfill: WebSocket,
        resyncInterval: 4000,
        awareness: new awarenessProtocol.Awareness(ydocInstance),
      }
    );

    setYjsProvider(provider);
  };

  const clearYjsProvider = () => {
    ydoc?.destroy();
    yjsProvider?.disconnect();
    setYjsProvider(null);
    setYDoc(null);
    setYText(null);
    setYComments(null); // Clear comments too
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
