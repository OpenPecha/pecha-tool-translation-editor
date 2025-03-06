import React, { useContext, useEffect, useRef, useState } from 'react'
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import { QuillBinding } from 'y-quill';
import { useAuth } from '../contexts/AuthContext';
import YjsContext from '../hook/yjsProvider';

Quill.register('modules/cursors', QuillCursors);

function Editor() {
      const editorRef = useRef(null);
      const quillRef = useRef(null);

      const [synced, setSynced] = useState(false);
      const { clearYjsProvider,toggleConnection,online, yText, yjsProvider } = useContext(YjsContext)
      const [charLength, setLength] = useState(0);
      useEffect(()=>{
            const quill = new Quill(editorRef.current, {
              theme: 'snow',
              modules: {
                toolbar: [
                  ['bold', 'italic', 'underline', 'strike'],
                  ['blockquote', 'code-block'],
                  ['link', 'image', 'video', 'formula'],
                  [{ 'header': 1 }, { 'header': 2 }],
                  [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
                  [{ 'script': 'sub' }, { 'script': 'super' }],
                  [{ 'indent': '-1' }, { 'indent': '+1' }],
                  [{ 'direction': 'rtl' }],
                  [{ 'size': ['small', false, 'large', 'huge'] }],
                  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                  [{ 'color': [] }, { 'background': [] }],
                  [{ 'font': [] }],
                  [{ 'align': [] }],
                  ['clean']
                ],
                cursors: { transformOnTextChange: false },
                history:{
                  delay: 2000,
                  maxStack: 500,
                }
              },
              placeholder: 'Start collaborating...',
            });
            setLength(quill.getLength());
      
            // quill.on('text-change', () => {
            //   setCount(quill.getText().trim().length);
            // });
            const editorContainer = quill.root;
            const handleScroll = () => {
                console.log("Scroll Position:", editorContainer?.scrollTop);
              };
            quillRef.current = quill;
            new QuillBinding(yText, quill, yjsProvider?.awareness);
            editorContainer?.addEventListener("scroll", handleScroll);
            let timeout;
  quill.on('text-change', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      setLength(quill.getLength()); // Update char count with delay
    }, 500);
  });
            yjsProvider?.on("sync", (isSynced) => {
                setSynced(isSynced)
            });
            console.log(yjsProvider)
           
            // **Yjs Content Load Detection**
            
            return () => {
                console.log('cleanup')
                clearYjsProvider()
                let menu = document.querySelectorAll('.ql-toolbar');
                menu.forEach((e) => e.remove());
                editorContainer?.removeEventListener("scroll", handleScroll);
            };
        },[])


        return (<>
    <button  onClick={toggleConnection} style={{ marginBottom: '10px' }}>
          {online?"connected":"disconnected"}
    </button>
    <div>{synced?"synced":"not synced"}</div>
    <div>char count :{charLength}</div>
    <div ref={editorRef} style={{ height: '400px', marginTop: '10px' }} />
  </>
  )
}

export default Editor