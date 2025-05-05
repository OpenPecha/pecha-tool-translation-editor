/* eslint-disable no-console */
const syncProtocol = require('y-protocols/dist/sync.cjs')
const awarenessProtocol = require('y-protocols/dist/awareness.cjs')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const Y = require('yjs')
const { PrismaClient } = require("@prisma/client");
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

let persistence = null

const messageSync = 0
const messageAwareness = 1
const wsReadyStateConnecting = 0
const largeContentCharacterLength = 10000; 
const wsReadyStateOpen = 1
const docs = new Map()

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */
const updateHandler = (update, origin, doc) => {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeUpdate(encoder, update)
  const message = encoding.toUint8Array(encoder)
  doc.conns.forEach((_, conn) => send(doc, conn, message))
}

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 * @param {Uint8Array} m
 */
const send = (doc, conn, m) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn)
  }

  try {
    conn.send(
      m,
      /** @param {any} err */ err => {
        err != null && closeConn(doc, conn)
      },
    )
  } catch (e) {
    closeConn(doc, conn)
  }
}

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
const closeConn = (doc, conn) => {
  if (doc.conns.has(conn)) {
    /**
     * @type {Set<number>}
    */
   // @ts-ignore
   const controlledIds = doc.conns.get(conn)
    doc.conns.delete(conn)
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null,
    )

    if (doc.conns.size === 0 && persistence !== null) {
      // if persisted, we store state and destroy ydocument
      persistence.writeState(doc).then(() => {
        doc.destroy()
      })
      docs.delete(doc.name)
    }
  }

  conn.close()
}

  persistence = {

    bindState: async (id, doc) => {
      const docInstance = await prisma.doc.findUnique({
        where: { id },
        select: { docs_y_doc_state: true },
      });
      
      if (docInstance?.docs_y_doc_state) {
          Y.applyUpdateV2(doc, docInstance.docs_y_doc_state);
      }
    },
    writeState: async (ydoc) => {

      const id = ydoc.name
      const state = Y.encodeStateAsUpdateV2(ydoc)
      const stateSizeInBytes = state.byteLength;
      const yText = ydoc.getText(id)
      const delta = yText.toDelta()
      console.log('Yjs document state size:', stateSizeInBytes, 'bytes');
      const text_length= yText.toString().length;
      
      // ✅ Build a fresh Y.Doc and apply delta
      // Get the text content and delta with proper encoding
        try {
          if(text_length < largeContentCharacterLength)   {
            // Update the database with proper encoding
            await prisma.doc.update({
              where: { id },
              data: {
                docs_prosemirror_delta: delta,
                docs_y_doc_state: state,
              },
            });
          }
          // Write delta to a separate file for debugging/tracking changes
          const fs = require('fs');
          const path = require('path');
          const dataDir = path.join(__dirname, '../../../logs');
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          const dataFile = path.join(dataDir, 'data.txt');
          fs.writeFileSync(dataFile, `${new Date().toISOString()} - Doc ID: ${id}\n${JSON.stringify(delta, null, 2)}\n\n`);
        } catch (error) {
          console.log(error)
        }


        
    },
  }


module.exports = {
  syncProtocol,
  awarenessProtocol,
  encoding,
  persistence,
  messageSync,
  wsReadyStateConnecting,
  wsReadyStateOpen,
  docs,
  updateHandler,
  decoding,
  send,
  closeConn,
  messageAwareness,
}
