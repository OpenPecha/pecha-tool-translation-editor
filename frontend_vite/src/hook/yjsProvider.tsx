import React, { useState } from 'react'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import {Awareness} from 'y-protocols/awareness.js'
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

const YjsProvider = ({  children }) => {
    const [yjsProvider, setYjsProvider] = useState(null)
    const [ydoc, setYDoc] = useState(null)
    const [yText, setYText] = useState(null)
    const [online,setOnline] = useState(true)    
    const awarenessProtocol = { Awareness }
    const createYjsProvider = (docIdentifier:string|null) => {
        let identifier = docIdentifier
        let ydocInstance = null
  
        if (ydoc) {
          ydocInstance = ydoc
        } else {
          ydocInstance = new Y.Doc()
          setYDoc(ydocInstance)
        }
        const yTextInstance = ydocInstance.getText(docIdentifier);
        setYText(yTextInstance)
        if (!identifier) {
          identifier = Array.from(Array(20), () => Math.floor(Math.random() * 36).toString(36)).join('');
          // eslint-disable-next-line no-restricted-globals
          window.history.replaceState( {} , identifier, `/${identifier}` );
        }
  
        // eslint-disable-next-line no-restricted-globals
        const provider = new WebsocketProvider(CLIENT_WEBSOCKET_URL, identifier, ydocInstance, {
          params: { token: localStorage.getItem('token') || '' },
          WebSocketPolyfill: WebSocket, // Ensure compatibility
          resyncInterval:1000, // Retry failed connections
          awareness: new awarenessProtocol.Awareness(ydocInstance) // Better connection tracking
        });
        // provider.awareness.on('change', () => {
        //   setSharedUsers([...provider.awareness.getStates()])
        // })
  
        // if (currentUser) {
        //   provider.awareness.setLocalStateField('user', { 
        //     id: currentUser.id,
        //     color: currentUser.color, 
        //     displayName: currentUser.displayName || currentUser.email,
        //   })
        // } else if (localCurrentUser) {
        //   provider.awareness.setLocalStateField('user', localCurrentUser)
        // } else {
        //   const arrayColor = ['#D9E3F0', '#F47373', '#697689', '#37D67A', '#2CCCE4', '#555555', '#dce775', '#ff8a65', '#ba68c8']
  
        //   const color = arrayColor[(Math.floor(Math.random() * arrayColor.length))]
    
        //   provider.awareness.setLocalStateField('user', { id: provider.awareness.clientID, color, displayName: 'Anonymous' })
  
        //   localStorage.setItem('YjsCurrentUser', JSON.stringify(provider.awareness.getLocalState().user))
        // }
  
        setYjsProvider(provider)
      }
    const clearYjsProvider = () => {
        setYjsProvider(null)
        setYDoc(null)
        setYText(null)
      }
      const toggleConnection =()=>  {
        if (!yjsProvider) return;
        if (yjsProvider.wsconnected) {
          yjsProvider.disconnect();
          setOnline(false);
        } else {
          yjsProvider.connect();
          setOnline(true);
        }
      }
    return (
        <Provider value={{ yjsProvider, ydoc,  createYjsProvider ,yText,clearYjsProvider,toggleConnection,online}}>
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