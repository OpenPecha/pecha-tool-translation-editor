/* eslint-disable no-console */
const syncProtocol = require('y-protocols/dist/sync.cjs')
const awarenessProtocol = require('y-protocols/dist/awareness.cjs')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const Y = require('yjs')
const { PrismaClient } = require("@prisma/client");
const { fromUint8Array, toUint8Array } = require('js-base64')


const prisma = new PrismaClient();

let persistence = null

const messageSync = 0
const messageAwareness = 1
const wsReadyStateConnecting = 0
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

    bindState: async (identifier, doc) => {
      const docInstance = await prisma.doc.findUnique({
        where: { id:identifier },
        select: { docs_y_doc_state: true },
      });
      if (docInstance && docInstance.docsYDocState) {
        Y.applyUpdate(doc, docInstance.docsYDocState);
      }
    },
    writeState: async (ydoc) => {
      const identifier = ydoc.name
      const state = Y.encodeStateAsUpdate(ydoc)
      const base64Encoded = fromUint8Array(state)
      const binaryEncoded = toUint8Array(base64Encoded)
      const delta = ydoc.getText(identifier).toDelta()
      const existingDoc = await prisma.doc.findUnique({
        where: { id:identifier },
      });
      if (delta && delta.length > 0 ) {
        if (!existingDoc) {
          try {
            await prisma.doc.create({
              data: {
                identifier,
                docs_prosemirror_delta: delta,
                docs_y_doc_state: state
              },
            });
          } catch (e) {
            console.log(`Insert Query`)
            console.log(e)
          }
        } else {
          try {
            console.log('updated database')
            await prisma.doc.update({
              where: { id:identifier },
              data: {
                docs_prosemirror_delta: delta,
                docs_y_doc_state: state,
              },
            });
           
          } catch (e) {
            console.log(`Patch Query`)
            console.log(e)
          }
        }
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
