require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { createClient} =require('redis')
const http = require("http");
const moment=require("moment")
const WebSocket = require("ws");
const map = require('lib0/map')
const Y = require('yjs')
const { WSSharedDoc, utils } = require('./services')
const commentsRoutes = require("./routes/comments");
const documentsRoutes = require("./routes/documents");
const authenticateToken = require("./middleware/authenticate");

const prisma = new PrismaClient();
const app = express();
const SECRET_KEY = process.env.SECRET_KEY || "super-secret-key";

app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server,
  clientTracking:true,
  maxPayload: 1024 * 1024 * 50,
 },)
 
const client=createClient({
  url:process.env.REDIS_URL
})

client.connect().then(()=>console.log('redis connected')).catch(e=>{
    console.error('error with redis connection')
})

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use("/comments", commentsRoutes);
app.use("/documents", documentsRoutes(getYDoc));
const pingTimeout = 30000
const clients = new Set();


const messageListener = (conn, doc, message) => {
  try {
    const encoder = utils.encoding.createEncoder()
    const decoder = utils.decoding.createDecoder(message)
    const messageType = utils.decoding.readVarUint(decoder)

    // eslint-disable-next-line default-casec
    switch (messageType) {
      case utils.messageSync:
        utils.encoding.writeVarUint(encoder, utils.messageSync)
        utils.syncProtocol.readSyncMessage(decoder, encoder, doc, null)
        if (utils.encoding.length(encoder) > 1) {
          utils.send(doc, conn, utils.encoding.toUint8Array(encoder))
        }

        break
      case utils.messageAwareness:
        utils.awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          utils.decoding.readVarUint8Array(decoder),
          conn,
        )
        break
    }
  } catch (error) {
    console.error(error)
    doc.emit('error', [error])
  }
}
// Token route (for testing) 
  app.post("/token", async (req, res) => {
    const { username, password } = req.body;
  
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ detail: "Invalid username or password" });
    }
  
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "30m" });
    res.json({ access_token: token, token_type: "bearer" });
  });
  app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "User already exists" });
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, email, password: hashedPassword },
      });
  
      res.status(201).json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(500).json({ error: "Error creating user" });
    }
  });
  // User Login
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "30m" });
    res.json({ accessToken: token });
  });
  // Get user profile
  app.get("/users/me", authenticateToken, async (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, email: req.user.email });
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
        const docObject = await prisma.doc.findUnique({ where: { id: identifier } });
  
        if (docObject) {
  
          // Apply stored Y.Doc state if it exists
          if (docObject.docs_y_doc_state) {
            Y.applyUpdate(doc, docObject.docs_y_doc_state);
          }
  
          try {
            await addMemberAsViewer(identifier, userId);
          } catch (err) {
            console.log(`Error adding user ${userId} to document ${identifier}: ${err.message}`);
          }
        } else {
          console.log(`Creating new document in DB for: ${identifier}`);
  
          const state = Y.encodeStateAsUpdate(doc);
          const delta = doc.getText("prosemirror").toDelta();
  
          await prisma.doc.create({
            data: {
              id: identifier,
              identifier,
              docs_prosemirror_delta: delta,
              docs_y_doc_state: state,
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
      console.log("disconnected")
      clearInterval(pingInterval);
    });
  
    ws.on("error", (error) => {
      console.error("WebSocket Error:", error.message);
    });
  
    ws.on("ping", () => {
      pingReceived = true;
    });
  
    // **Send Initial Document State**
    {
      const encoder = utils.encoding.createEncoder();
      utils.encoding.writeVarUint(encoder, utils.messageSync);
      utils.syncProtocol.writeSyncStep1(encoder, doc);
      utils.send(doc, injectedWS, utils.encoding.toUint8Array(encoder));
  
      const awarenessStates = doc.awareness.getStates();
      if (awarenessStates.size > 0) {
        const encoder1 = utils.encoding.createEncoder();
        utils.encoding.writeVarUint(encoder1, utils.messageAwareness);
        utils.encoding.writeVarUint8Array(
          encoder1,
          utils.awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
        );
        utils.send(doc, injectedWS, utils.encoding.toUint8Array(encoder1));
      }
    }
  });
  

async function addMemberAsViewer(identifier, userId) {
  try {
    // Find the document by identifier
    const doc = await prisma.doc.findUnique({
      where: { id:identifier },
    })

    if (!doc) {
      throw new Error(`Document with identifier ${identifier} not found.`)
    }

    // Check if the user already has permissions
    const existingPermission = await prisma.permission.findUnique({
      where: {
        docId_userId: {
          docId: doc.id,
          userId: userId,
        },
      },
    })

    if (existingPermission) {
      return existingPermission
    }

    // Add the user as a viewer (read-only access)
    const newPermission = await prisma.permission.create({
      data: {
        docId: doc.id,
        userId: userId,
        canRead: true,
        canWrite: false,
      },
    })

    console.log(`User ${userId} added as a viewer to document ${identifier}`)
    return newPermission
  } catch (error) {
    console.error('Error adding user as viewer:', error)
    throw error
  }
}
async function broadcastUserList(id) {
    if(!id) return null
    const users = await client.sMembers(id);

    const message = JSON.stringify({ type: "user_list", users });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
