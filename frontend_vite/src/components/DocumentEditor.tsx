import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import 'quill/dist/quill.snow.css';
import YjsContext from '../hook/yjsProvider';
import Editor from './Editor';
import { fetchDocument } from '../api/document';
import { useAuth } from '../contexts/AuthContext';
// import useYdoc from '../hook/useYdoc';


const RealTimeEditor = () => {
  const { id } = useParams();
  const { createYjsProvider, yjsProvider, ydoc, yText, clearYjsProvider } = useContext(YjsContext)
  const { token } = useAuth();
  const [doc, setDoc] = useState(null);
  
  const roomId = id;
  useEffect(() => {
    fetchDocument(id,token).then((doc) => {
      console.log('hi')
      setDoc(doc)
      createYjsProvider(roomId);
    })
    // const yUndoManager = new Y.UndoManager(yText);
    
  }, []);

  

  if (!ydoc||!yjsProvider||!yText) return null;

  return (
    <>
    <div>name: {doc?.identifier}</div>
    <Editor />
    </>
  );
};

export default RealTimeEditor;
