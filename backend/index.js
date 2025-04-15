require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const map = require("lib0/map");
const Y = require("yjs");
const { WSSharedDoc, utils, messageListener } = require("./services");
const commentsRoutes = require("./routes/comments");
const versionsRoutes = require("./routes/versions");
const documentsRoutes = require("./routes/documents");
const pechaRoutes = require("./routes/pecha");
const textsRoutes = require("./routes/texts");
const userRoutes = require("./routes/user");
const prisma = new PrismaClient();
const app = express();
const SECRET_KEY = process.env.SECRET_KEY || "super-secret-key";


const ALLOWED_URLS = process.env.ALLOWED_URLS ? process.env.ALLOWED_URLS.split(",") : ["http://localhost:3000"];
app.use(cors({
  origin: true, // reflects the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));


const server = http.createServer(app);
const wss = new WebSocket.Server({
  server,
  clientTracking: true,
  maxPayload: 1024 * 1024 * 50,
});

const getYDoc = (docName, userId) =>
  map.setIfUndefined(utils.docs, docName, () => {
    const doc = new WSSharedDoc(docName, userId);
    doc.gc = false; // Disable garbage collection for large docs
    if (utils.persistence !== null) {
      utils.persistence.bindState(docName, doc);
    }
    return doc;
  });
 
app.get('/',(req,res)=>{
  res.send('Hello World!')
})

app.use(express.json({ limit: "50mb" })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/comments", commentsRoutes);
app.use("/versions", versionsRoutes);
app.use("/documents", documentsRoutes(getYDoc));
app.use("/pecha", pechaRoutes);
app.use("/texts", textsRoutes);
app.use("/users",userRoutes)
const pingTimeout = 30000;
const clients = new Set();

wss.on("connection", async (ws, request) => {
  const injectedWS = ws;
  injectedWS.binaryType = "arraybuffer";
  const [identifier, params] = request.url.slice(1).split("?");
  let pingReceived = true;
  let userId = null;

  const token = params?.split("=")[1] || "";
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.id;
  } catch (e) {
    userId = null;
  }

  let doc = getYDoc(identifier, userId);
  try {
    if (userId) {
      const docObject = await prisma.doc.findUnique({
        where: { id: identifier },
        select: {
          docs_y_doc_state: true,
          docs_prosemirror_delta: true,
        },
      });

      if (docObject) {
        // Apply stored Y.Doc state if it exists
        if (docObject.docs_y_doc_state) {
          Y.applyUpdate(doc, docObject.docs_y_doc_state);
          // Log the content after applying the update
        }

        try {
          await addMemberAsViewer(identifier, userId);
        } catch (err) {
          console.log(
            `Error adding user ${userId} to document ${identifier}: ${err.message}`
          );
        }
      } else {
        console.log(`Creating new document in DB for: ${identifier}`);

        const state = Y.encodeStateAsUpdate(doc);
        const delta = doc.getText("prosemirror").toDelta();

        await prisma.doc.create({
          data: {
            identifier,
            docs_prosemirror_delta: delta,
            docs_y_doc_state: state,
            ownerId: userId,
          },
        });
      }
    }
  } catch (error) {
    console.error(error);
  }

  doc.conns.set(injectedWS, new Set());

  ws.on("message", async (message) => {
    messageListener(injectedWS, doc, new Uint8Array(message));
    clients.add(ws);
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    }
  });

  const pingInterval = setInterval(() => {
    if (!pingReceived) {
      if (doc.conns.has(injectedWS)) {
        utils.closeConn(doc, injectedWS);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(injectedWS)) {
      pingReceived = false;
      try {
        if (injectedWS.readyState === WebSocket.OPEN) {
          injectedWS.ping();
        }
      } catch (error) {
        utils.closeConn(doc, injectedWS);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);

  ws.on("close", async () => {
    utils.closeConn(doc, injectedWS);
    clearInterval(pingInterval);
  });

  ws.on("error", (error) => {
    console.error("WebSocket Error:", error.message);
  });

  ws.on("ping", () => {
    pingReceived = true;
  });

  // Send Initial Document State
  {
    const encoder = utils.encoding.createEncoder();
    utils.encoding.writeVarUint(encoder, utils.messageSync);
    utils.syncProtocol.writeSyncStep1(encoder, doc);
    const message = utils.encoding.toUint8Array(encoder);

    utils.send(doc, injectedWS, message);

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder1 = utils.encoding.createEncoder();
      utils.encoding.writeVarUint(encoder1, utils.messageAwareness);
      utils.encoding.writeVarUint8Array(
        encoder1,
        utils.awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      utils.send(doc, injectedWS, utils.encoding.toUint8Array(encoder1));
    }
  }
});

async function addMemberAsViewer(identifier, userId) {
  try {
    // Find the document by identifier
    const doc = await prisma.doc.findUnique({
      where: { id: identifier },
    });

    if (!doc) {
      throw new Error(`Document with identifier ${identifier} not found.`);
    }

    // Check if the user already has permissions
    const existingPermission = await prisma.permission.findUnique({
      where: {
        docId_userId: {
          docId: doc.id,
          userId: userId,
        },
      },
    });

    if (existingPermission) {
      return existingPermission;
    }

    // Add the user as a viewer (read-only access)
    const newPermission = await prisma.permission.create({
      data: {
        docId: doc.id,
        userId: userId,
        canRead: true,
        canWrite: false,
      },
    });

    console.log(`User ${userId} added as a viewer to document ${identifier}`);
    return newPermission;
  } catch (error) {
    console.error("Error adding user as viewer:", error);
    throw error;
  }
}

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
