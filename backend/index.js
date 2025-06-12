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
const projectRoutes = require("./routes/project");
const apiCredentialsRoutes = require("./routes/apiCredentials");

const options = {
  info: {
    version: "1.0.0",
    title: "Pecha Translation Editor API",
    description: "API for the Pecha Translation Editor application",
    license: {
      name: "MIT",
    },
  },
  security: {
    BearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
  // Base directory which we use to locate your JSDOC files
  baseDir: __dirname,
  // Glob pattern to find your jsdoc files (multiple patterns can be added in an array)
  filesPattern: "./**/*.js",
  // URL where SwaggerUI will be rendered
  swaggerUIPath: "/docs",
  // Expose OpenAPI UI
  exposeSwaggerUI: true,
  // Expose Open API JSON Docs documentation in `apiDocsPath` path.
  exposeApiDocs: true,
  // Open API JSON Docs endpoint.
  apiDocsPath: "/api-docs.json",
  // Set non-required fields as nullable by default
  notRequiredAsNullable: false,
  // You can customize your UI options.
  swaggerUiOptions: {
    explorer: true,
    docExpansion: "list",
    filter: true,
  },
  // multiple option in case you want more that one instance
  multiple: false,
  // Exclude routes that don't have explicit documentation
  ignorePaths: ["/"],
};

const expressJSDocSwagger = require("express-jsdoc-swagger");

// const { auth0VerifyToken } = require("./middleware/authenticate");
// const prisma = new PrismaClient();
const app = express();
// const SECRET_KEY = process.env.SECRET_KEY || "super-secret-key";

// const ALLOWED_URLS = process.env.ALLOWED_URLS ? process.env.ALLOWED_URLS.split(",") : ["http://localhost:3000"];
app.use(
  cors({
    origin: true, // reflects the request origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

expressJSDocSwagger(app)(options);

const server = http.createServer(app);
// const pingTimeout = 30000
// const wss = new WebSocket.Server({
//   server,
//   clientTracking: true,
//   maxPayload: 1024 * 1024 * 1024 * 50,
//   WebSocket: WebSocket
// });
// let count=0;

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "API is running properly",
    version: "1.0.0",
  });
});

app.use(express.json({ limit: "50mb" })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/comments", commentsRoutes);
app.use("/versions", versionsRoutes);
app.use("/documents", documentsRoutes);
app.use("/pecha", pechaRoutes);
app.use("/texts", textsRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/api-credentials", apiCredentialsRoutes);
const clients = new Set();
// const getYDoc = (docId, userId) =>
//   map.setIfUndefined(utils.docs, docId, () => {
//     const doc = new WSSharedDoc(docId, userId);
//     // Disable garbage collection for large docs
//     doc.gc = true;
//     console.log()
//     if(utils.persistence !== null) {
//       utils.persistence.bindState(docId, doc)
//     }
//     utils.docs.set(docId, doc)
//     doc.on("update", (update) => {
//       console.log("Doc updated:",count++)

//     })
//     return doc;
//   });
// wss.on("connection", async (ws, request) => {
//   const injectedWS = ws;
//   injectedWS.binaryType = "arraybuffer";
//   const [docId, params] = request.url.slice(1).split("?");
//   let pingReceived = true;
//   let userId = null;

//   const token = params?.split("=")[1] || null;
//   try {
//     if(token && token!==''){
//       let user=await auth0VerifyToken(token);
//       userId = user?.sub;
//     }
//   } catch (e) {
//     console.log('errer user',e)
//   }
//   let doc = getYDoc(docId, userId);
//   try {
//     if (userId) {
//       const docObject = await prisma.doc.findUnique({
//         where: { id: docId },
//         select: {
//           docs_y_doc_state: true,
//           docs_prosemirror_delta: true,
//         },
//       });

//       if (docObject) {
//         await addMemberAsViewer(docId, userId);
//       }
//     }
//   } catch (error) {
//     console.error(error);
//   }

//   doc.conns.set(injectedWS, new Set());

//   ws.on("message", async (message) => {
//     messageListener(injectedWS, doc, new Uint8Array(message));
//     clients.add(ws);
//     for (const client of clients) {
//       if (client !== ws && client.readyState === WebSocket.OPEN) {
//         client.send(message.toString());
//       }
//     }
//   });

//   const pingInterval = setInterval(() => {
//     if (!pingReceived) {
//       if (doc.conns.has(injectedWS)) {
//         utils.closeConn(doc, injectedWS);
//       }
//       clearInterval(pingInterval);
//     } else if (doc.conns.has(injectedWS)) {
//       pingReceived = false;
//       try {
//         if (injectedWS.readyState === WebSocket.OPEN) {
//           injectedWS.ping();
//         }
//       } catch (error) {
//         utils.closeConn(doc, injectedWS);
//         clearInterval(pingInterval);
//       }
//     }
//   }, pingTimeout);

//   ws.on("close", async () => {
//     console.log("Client disconnected");
//     utils.closeConn(doc, injectedWS);
//     clearInterval(pingInterval);
//   });

//   ws.on("ping", () => {
//     pingReceived = true;
//   });

//   // Check if document is large before sending initial state
//   {

//       const encoder = utils.encoding.createEncoder();
//       utils.encoding.writeVarUint(encoder, utils.messageSync);
//       utils.syncProtocol.writeSyncStep1(encoder, doc);
//       const message = utils.encoding.toUint8Array(encoder);

//       utils.send(doc, injectedWS, message);

//       const awarenessStates = doc.awareness.getStates();
//       if (awarenessStates.size > 0) {
//         const encoder1 = utils.encoding.createEncoder();
//         utils.encoding.writeVarUint(encoder1, utils.messageAwareness);
//         utils.encoding.writeVarUint8Array(
//           encoder1,
//           utils.awarenessProtocol.encodeAwarenessUpdate(
//             doc.awareness,
//             Array.from(awarenessStates.keys())
//           )
//         );
//         utils.send(doc, injectedWS, utils.encoding.toUint8Array(encoder1));
//       }
//   }
// });

// async function addMemberAsViewer(identifier, userId) {
//   try {
//     // Find the document by identifier
//     const doc = await prisma.doc.findUnique({
//       where: { id: identifier },
//     });

//     if (!doc) {
//       throw new Error(`Document with identifier ${identifier} not found.`);
//     }

//     // Check if the user already has permissions
//     const existingPermission = await prisma.permission.findUnique({
//       where: {
//         docId_userId: {
//           docId: doc.id,
//           userId: userId,
//         },
//       },
//     });

//     if (existingPermission) {
//       return existingPermission;
//     }

//     // Add the user as a viewer (read-only access)
//     const newPermission = await prisma.permission.create({
//       data: {
//         docId: doc.id,
//         userId: userId,
//         canRead: true,
//         canWrite: false,
//       },
//     });

//     console.log(`User ${userId} added as a viewer to document ${identifier}`);
//     return newPermission;
//   } catch (error) {
//     console.error("Error adding user as viewer:", error);
//     throw error;
//   }
// }

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
