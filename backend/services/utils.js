/* eslint-disable no-console */
const syncProtocol = require("y-protocols/dist/sync.cjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const encoding = require("lib0/encoding");
const decoding = require("lib0/decoding");
const Y = require("yjs");

let persistence = null;

const messageSync = 0;
const messageAwareness = 1;
const wsReadyStateConnecting = 0;
const largeContentCharacterLength = 900000;
const wsReadyStateOpen = 1;
const docs = new Map();

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */
const updateHandler = (update, origin, doc) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

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
    closeConn(doc, conn);
  }

  try {
    conn.send(
      m,
      /** @param {any} err */ (err) => {
        err != null && closeConn(doc, conn);
      }
    );
  } catch (e) {
    closeConn(doc, conn);
  }
};

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
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );

    if (doc.conns.size === 0 && persistence !== null) {
      // if persisted, we store state and destroy ydocument
      persistence.writeState(doc).then(() => {
        doc.destroy();
      });
      docs.delete(doc.name);
    }
  }

  conn.close();
};

persistence = {
  bindState: async (id, doc) => {
    // Y.js state is no longer stored directly - content comes from versions
    console.log("Y.js bindState called for document:", id);
  },
  writeState: async (ydoc) => {
    const id = ydoc.name;
    const state = Y.encodeStateAsUpdateV2(ydoc);
    const stateSizeInBytes = state.byteLength;
    const yText = ydoc.getText(id);
    const delta = yText.toDelta();
    console.log("Yjs document state size:", stateSizeInBytes, "bytes");
    const text_length = yText.toString().length;

    // ✅ Build a fresh Y.Doc and apply delta
    // Get the text content and delta with proper encoding

    try {
      if (text_length < largeContentCharacterLength) {
        // Y.js state and delta no longer stored directly in doc table
        // Content is managed through the Version system
        console.log("Y.js writeState called for document:", id);
      }

      // Write delta for debug
      const fs = require("fs");
      const path = require("path");
      const dataDir = path.join(__dirname, "../../../logs");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const dataFile = path.join(dataDir, "data.txt");
      fs.writeFileSync(
        dataFile,
        `${new Date().toISOString()} - Doc ID: ${id}\n${JSON.stringify(
          delta,
          null,
          2
        )}\n\n`
      );

      // ✅ Compact: Replace the in-memory doc with fresh Y.Doc
      const freshDoc = new Y.Doc();
      freshDoc.name = id;
      Y.applyUpdateV2(freshDoc, state);
      freshDoc.awareness = ydoc.awareness;
      freshDoc.conns = ydoc.conns;

      docs.set(id, freshDoc); // Replace in your doc map
      ydoc.destroy(); // Destroy old doc
    } catch (error) {
      console.log(error);
    }
  },
};

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
};
