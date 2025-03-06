import React, { useState } from 'react'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness.js'

const YjsContext = React.createContext({})

const { Provider, Consumer } = YjsContext
const CLIENT_WEBSOCKET_URL = import.meta.env.VITE_CLIENT_WEB_SOCKET || "ws://localhost:1234";

const withYjs = Component => {
    const C = props => (
      <Consumer>
        {(providerProps) => <Component {...providerProps} {...props} />}
      </Consumer>
    )
    return C
}

const YjsProvider = ({ children }) => {
    const [yjsProvider, setYjsProvider] = useState(null)
    const [ydoc, setYDoc] = useState(null)
    const [yText, setYText] = useState(null)
    const [yComments, setYComments] = useState(null) // NEW: Comments storage
    const [online, setOnline] = useState(true)    
    const awarenessProtocol = { Awareness }

    const createYjsProvider = (docIdentifier = null) => {
        let identifier = docIdentifier
        let ydocInstance = ydoc

        if (!ydocInstance) {
            ydocInstance = new Y.Doc()
            setYDoc(ydocInstance)
        }

        const yTextInstance = ydocInstance.getText(docIdentifier)
        setYText(yTextInstance)

        // NEW: Create a shared Y.js Array for storing comments
        const yCommentsInstance = ydocInstance.getArray("comments")
        setYComments(yCommentsInstance)

        if (!identifier) {
            identifier = Array.from(Array(20), () => Math.floor(Math.random() * 36).toString(36)).join('');
            window.history.replaceState({}, identifier, `/${identifier}`);
        }

        const provider = new WebsocketProvider(CLIENT_WEBSOCKET_URL, identifier, ydocInstance, {
            params: { token: localStorage.getItem('token') || '' },
            WebSocketPolyfill: WebSocket,
            resyncInterval: 1000,
            awareness: new awarenessProtocol.Awareness(ydocInstance)
        });

        setYjsProvider(provider)
    }

    const clearYjsProvider = () => {
        setYjsProvider(null)
        setYDoc(null)
        setYText(null)
        setYComments(null) // Clear comments too
    }

    const toggleConnection = () => {
        if (!yjsProvider) return
        if (yjsProvider.wsconnected) {
            yjsProvider.disconnect()
            setOnline(false)
        } else {
            yjsProvider.connect()
            setOnline(true)
        }
    }

    return (
        <Provider value={{ yjsProvider, ydoc, createYjsProvider, yText, yComments, clearYjsProvider, toggleConnection, online }}>
            {children}
        </Provider>
    )
}

export {
    Consumer as YjsConsumer,
    YjsProvider,
    withYjs,
}

export default YjsContext
