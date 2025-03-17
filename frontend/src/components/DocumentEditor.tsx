import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import 'quill/dist/quill.snow.css';
import YjsContext from '../lib/yjsProvider';
import Editor from './Editor';
import { fetchDocument } from '../api/document';
import { useAuth } from '../contexts/AuthContext';
// import useYdoc from '../hook/useYdoc';


const RealTimeEditor = ({docId}:{docId:string | undefined}) => {
  const { id } = useParams();
  const { createYjsProvider, yjsProvider, ydoc, yText, clearYjsProvider } = useContext(YjsContext)
  const { currentUser } = useAuth();
  const [doc, setDoc] = useState(null);
  const [isEditable, setIsEditable] = useState(false);
  const roomId = docId ?? id;
  useEffect(() => {
    fetchDocument(roomId).then((doc) => {
      if(doc?.permissions){
        doc?.permissions.find((permission) => {
          if(permission.userId === currentUser.id){
            setIsEditable(true)
          }
        })
      }
      setDoc(doc)
      createYjsProvider(roomId);
    })
    // const yUndoManager = new Y.UndoManager(yText);
    
  }, []);

  

  if (!ydoc||!yjsProvider||!yText ||!roomId ) return null;

  return (
    <Editor documentId={roomId} isEditable={isEditable}/>
  );
};

export default RealTimeEditor;
