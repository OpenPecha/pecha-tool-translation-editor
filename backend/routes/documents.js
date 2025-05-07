const express = require("express");
const {authenticate} = require("../middleware/authenticate");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const { WSSharedDoc } = require("../services");
const Y = require("yjs");
const Delta = require('quill-delta');

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(), // Keeps file in memory, not saved on disk
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/plain") {
      return cb(new Error("Only .txt files are allowed"));
    }
    cb(null, true);
  },
});

  // Create a new document
  router.post("/", authenticate, upload.single("file"), async (req, res) => {

    try {
      const document_id = crypto.randomUUID();
      const { identifier, isRoot, rootId,language } = req.body;
      if (!identifier)
        return res
          .status(400)
          .json({ error: "Missing identifier in query params" });

      const doc = new WSSharedDoc(document_id, req.user.id);
      // Update the Y.doc with file content
      const prosemirrorText = doc.getText(document_id);
      if (req?.file) {
        const textContent = req.file.buffer.toString("utf-8");
        if (textContent) {
          prosemirrorText.delete(0, prosemirrorText.length);
          prosemirrorText.insert(0, textContent);
        }
      }
      const delta = prosemirrorText.toDelta();
      const state = Y.encodeStateAsUpdateV2(doc);

      const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.doc.create({
        data: {
          id:document_id,
          identifier,
          name: identifier,
          ownerId: req.user.id,
          docs_y_doc_state: state,
          docs_prosemirror_delta: delta,
          isRoot: isRoot === "true",
          rootId: rootId ?? null,
          language,
        },
      });
      await tx.permission.create({
        data: {
          docId: doc.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
          
        },
      });
      await tx.version.create({
        data:{
          content:{ops:delta},
          docId:doc.id,
          label:"initail Auto-save",
        }
      })
  
      return doc;
    })
 

      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ error: "Error creating document: " + error });
    }
  });

  // Get all documents for the user
  // Get all documents for the user
  router.get("/", authenticate, async (req, res) => {
    try {
      const { search, isRoot } = req.query;
      
      let whereCondition = {
        OR: [
          { ownerId: req.user.id },
          { permissions: { some: { userId: req.user.id, canRead: true } } },
        ],
      };
      
      // Add search filter if provided
      if (search) {
        whereCondition.OR = whereCondition.OR.map(condition => ({
          ...condition,
          identifier: { contains: search, mode: 'insensitive' }
        }));
      }
      
      // Filter by isRoot if provided
      if (isRoot === 'true') {
        whereCondition = {
          ...whereCondition,
          isRoot: true
        };
      }
      
      const documents = await prisma.doc.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
          identifier: true,
          ownerId: true,
          permissions: true,
          language: true,
          isRoot: true,
          isPublic: true,
          translations: {
            select: {
              id: true,
              language: true,
              ownerId: true,
              permissions: true,
              updatedAt: true,
            },
          },
          updatedAt: true,
          root: {
            select: {
              name:true,
            },
          },
          rootId: true,
        },
        orderBy: {
          isRoot: "desc",
        },
      });
      res.json(documents);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error fetching documents" });
    }
  });

  router.get("/public", authenticate, async (req, res) => {
    try {
      const documents = await prisma.doc.findMany({
        where: {
          AND: [{ ownerId: { not: req.user.id } }, { isPublic: true }],
        },
        select: {
          id: true,
          name: true,
          identifier: true,
          ownerId: true,
          permissions: true,
          language: true,
          isRoot: true,
          isPublic: true,
          translations: true,
          updatedAt: true,
          root: {
            select: {
              name: true,
            },
          },
          rootId: true,
        },
        orderBy: {
          isRoot: "desc",
        },
      });
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Error fetching documents" });
    }
  });
  // Get a specific document
  // Get a specific document and return its content
  router.get("/:id", authenticate, async (req, res) => {
    try {
      const document = await prisma.doc.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          identifier: true,
          ownerId: true,
          permissions: true,
          language: true,
          isRoot: true,
          isPublic: true,
          docs_prosemirror_delta:true,
          translations: {
            select:{
              id:true,
              name:true,
              language:true,
              identifier:true,
              updatedAt:true
            }
          },
        },
      });
      if (!document)
        return res.status(404).json({ error: "Document not found" });

      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: { projectId: document.rootProjectId, userId: req.user.id, canRead: true },
        });
        if (!permission && !document.isPublic)
          return res.status(403).json({ error: "No access" });
      }

      // Decode Y.js state (if stored as Uint8Array) and convert to Delta
      let delta = [];
      if (document.docs_y_doc_state) {
        const ydoc = new Y.Doc({gc:true});
        // Y.applyUpdate(ydoc, document.docs_y_doc_state);
        delta = ydoc.getText(document.identifier).toDelta(); // Convert to Quill-compatible Delta
      } else if (document.docs_prosemirror_delta) {
        delta = document.docs_prosemirror_delta;
      }
      res.json(document);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error retrieving document" });
    }
  });

  router.get("/:id/content", authenticate, async (req, res) => {
    try {
      const document = await prisma.doc.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          identifier: true,
          ownerId: true,
          permissions: true,
          language: true,
          isRoot: true,
          docs_prosemirror_delta: true,
        },
      });
      if (!document)
        return res.status(404).json({ error: "Document not found" });

      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: { projectId: document.rootProjectId, userId: req.user.id, canRead: true },
        });
        if (!permission && !document.isPublic)
          return res.status(403).json({ error: "No access" });
      }

      // Decode Y.js state (if stored as Uint8Array) and convert to Delta
      let delta = [];
      if (document.docs_y_doc_state) {
        const ydoc = new Y.Doc({gc:true});
        // Y.applyUpdate(ydoc, document.docs_y_doc_state);
        delta = ydoc.getText(document.identifier).toDelta(); // Convert to Quill-compatible Delta
      } else if (document.docs_prosemirror_delta) {
        delta = document.docs_prosemirror_delta;
      }
      res.json(document);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error retrieving document" });
    }
  });

  // Update a document
  router.put("/:id", authenticate, async (req, res) => {
    const { docs_prosemirror_delta, docs_y_doc_state } = req.body;
    try {
      const document = await prisma.doc.findUnique({
        where: { id: req.params.id },
      });
      if (!document)
        return res.status(404).json({ error: "Document not found" });

      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: { docId: document.id, userId: req.user.id, canWrite: true },
        });
        if (!permission)
          return res.status(403).json({ error: "No edit access" });
      }

      const updatedDocument = await prisma.doc.update({
        where: { id: document.id },
        data: { docs_prosemirror_delta, docs_y_doc_state },
      });

      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ error: "Error updating document" });
    }
  });
  // delete a document
  router.delete("/:id", authenticate, async (req, res) => {
    try {
      const document = await prisma.doc.findUnique({
        where: { id: req.params.id },
      });
      if (!document)
        return res.status(404).json({ error: "Document not found" });

      if (document.ownerId !== req.user.id) {
        return res.status(403).json({
          error: "You do not have permission to delete this document",
        });
      }

      await prisma.doc.delete({ where: { id: document.id } });
      await prisma.permission.deleteMany({ where: { docId: document.id } });

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error deleting document" });
    }
  });

  router.post("/:id/permissions", authenticate, async (req, res) => {
    let { email, canRead, canWrite } = req.body;
    const documentId = req.params.id;
    try {
      let user = await prisma.user.findFirst({ where: { email } });
      if (!user) return res.status(404).json({ error: "User not found" });
      const userId = user.id;
      // Check if the document exists
      canRead = canRead === "true" || canRead === true;
      canWrite = canWrite === "true" || canWrite === true;
      const document = await prisma.doc.findUnique({
        where: { id: documentId },
        include: {
          translations: true,
        },
      });
      if (!document)
        return res.status(404).json({ error: "Document not found" });
      // Ensure the requesting user is the owner of the document
      if (document.ownerId !== req.user.id) {
        return res.status(403).json({
          error: "You do not have permission to modify this document",
        });
      }

      // Check if the user already has permissions
      const existingPermission = await prisma.permission.findFirst({
        where: { docId: documentId, userEmail: email },
      });

      if (existingPermission) {
        // Update existing permission
        await prisma.permission.update({
          where: { id: existingPermission.id },
          data: { canRead, canWrite },
        });
      } else {
        // Create a new permission entry
        try {
          await prisma.permission.create({
            data: { docId: documentId, userId, userEmail: email, canRead, canWrite },
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: "user doesnt exist" });
        }
      }

      // If document is root, give same permissions to all translations
      if (document.isRoot && document.translations.length > 0) {
        for (const translation of document.translations) {
          const existingTransPermission = await prisma.permission.findFirst({
            where: { docId: translation.id, userEmail: email },
          });

          if (existingTransPermission) {
            await prisma.permission.update({
              where: { id: existingTransPermission.id },
              data: { canRead, canWrite },
            });
          } else {
            await prisma.permission.create({
              data: { docId: translation.id, userId, userEmail: email, canRead, canWrite },
            });
          }
        }
      }

      res.json({ message: "Permission granted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error granting permission" });
    }
  });

  // Update document's root relationship and root status
  router.patch("/:id", authenticate, async (req, res) => {
    try {
      const { rootId, isRoot, translations, identifier, isPublic, name } = req.body;
      const documentId = req.params.id;

      // Check if the document exists
      const document = await prisma.doc.findUnique({
        where: { id: documentId },
        include: {
          root: true
        },
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Check permissions
      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: {
            docId: documentId,
            userId: req.user.id,
            canWrite: true,
          },
        });
        if (!permission) {
          return res.status(403).json({
            error: "You do not have permission to edit this document",
          });
        }
      }

      // Validate the request
      if (rootId && isRoot) {
        return res.status(400).json({
          error: "A document cannot be both a root and a translation",
        });
      }

      // If translations array is provided and document is not a root, reject
      if (translations && !document.isRoot && !isRoot) {
        return res.status(400).json({
          error: "Only root documents can have translations",
        });
      }

      // If rootId is provided, verify it exists
      if (rootId) {
        const rootDoc = await prisma.doc.findUnique({
          where: { id: rootId },
        });

        if (!rootDoc) {
          return res.status(404).json({ error: "Root document not found" });
        }

        if (!rootDoc.isRoot) {
          return res.status(400).json({
            error: "Target document is not a root document",
          });
        }
      }

      // If translations array is provided, verify all documents exist
      if (translations && Array.isArray(translations)) {
        const translationDocs = await prisma.doc.findMany({
          where: {
            id: {
              in: translations,
            },
          },
        });

        if (translationDocs.length !== translations.length) {
          return res.status(400).json({
            error: "One or more translation documents not found",
          });
        }

        // Check if any of these documents are roots or already translations
        const invalidDocs = translationDocs.filter(
          (doc) => doc.isRoot || doc.rootId !== null
        );

        if (invalidDocs.length > 0) {
          return res.status(400).json({
            error: "Some documents are already roots or translations",
            invalidDocs: invalidDocs.map((d) => d.id),
          });
        }
      }

      // Prepare the update data
      const updateData = {
        rootId: rootId || null,
        isRoot: isRoot ?? (rootId ? false : document.isRoot),
        // Only update identifier if explicitly provided, otherwise keep the original
        identifier: identifier || document.identifier,
        // Update name if provided
        name: name || document.name,
        isPublic: isPublic ?? document.isPublic,
      };

      // Update the document and its translations in a transaction
      const updatedDocument = await prisma.$transaction(async (tx) => {
        // Update the main document
        const updated = await tx.doc.update({
          where: { id: documentId },
          data: updateData,
          select: {
            root: true,
            translations: {
              select:{
                id:true
              }
            },
          },
        });

        // If translations array is provided and document is/will be a root,
        // update all translation documents
        if (
          translations &&
          Array.isArray(translations) &&
          (document.isRoot || isRoot)
        ) {
          await tx.doc.updateMany({
            where: {
              id: {
                in: translations,
              },
            },
            data: {
              rootId: documentId,
              isRoot: false,
              // Only update name for translations, keep identifier the same
              name: name || document.name,
            },
          });

          // Fetch the updated document with all relationships
          return await tx.doc.findUnique({
            where: { id: documentId },
            include: {
              root: true,
              translations: {
                select:{id:true}
              },
            },
          });
        }

        return updated;
      });

      res.json({
        success: true,
        data: updatedDocument,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update document content
  router.patch("/:id/content", authenticate, async (req, res) => {
    const { docs_prosemirror_delta } = req.body;
    try {
      const document = await prisma.doc.findUnique({
        where: { id: req.params.id },
        select:{ownerId:true,
          id:true,
          docs_prosemirror_delta:true
        }
      });
      if (!document)
        return res.status(404).json({ error: "Document not found" });
  
      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: { docId: document.id, userId: req.user.id, canWrite: true },
        });
        if (!permission)
          return res.status(403).json({ error: "No edit access" });
      }
      
      // Approach 1: If we need to merge with existing Y.doc state
      const ydoc = new Y.Doc({gc:true});
      
      // If the document already has Y.doc state, we should first apply that
      // if (document.docs_y_doc_state) {
      //   Y.applyUpdateV2(ydoc, document.docs_y_doc_state);
      // }
      
      // Get the shared text type from the Y.doc
      const ytext = ydoc.getText(req.params.id);
      
      // Convert ProseMirror delta to Y.js compatible operations
      // This is the critical part that was missing
      if (docs_prosemirror_delta) {
        // Process the delta operations to make them compatible with Y.js
        // You may need a custom conversion function depending on your delta format
        const yDelta = convertProseMirrorDeltaToYDelta(docs_prosemirror_delta);
        ytext.applyDelta(yDelta);
      }
  
      // Encode the updated Y.doc state
      
      const docs_y_doc_state = Y.encodeStateAsUpdateV2(ydoc);

      // Validate the state isn't too small/empty
      // if (docs_y_doc_state.length < 100) {
      //   console.log('Y.js state is too small, skipping update');
      //   return res.status(400).json({ error: "Invalid document state" });
      // }
      
      // Uncomment this to actually update the database
      const updatedDocument = await prisma.doc.update({
        where: { id: document.id },
        data: { 
          docs_prosemirror_delta, 
          docs_y_doc_state 
        },
      });
      res.json({
        success: true,
        data: updatedDocument
      });
    } catch (error) {
      console.error("Error updating document content:", error);
      res.status(500).json({ error: "Error updating document content" });
    }
  });
  
  /**
   * Convert ProseMirror delta format to Y.js delta format
   * You'll need to customize this based on your specific delta format
   */
  function convertProseMirrorDeltaToYDelta(prosemirrorDelta) {
    // This is a simplified example - your actual conversion will depend on 
    // the specific structure of your ProseMirror delta
    const yDelta = [];
    
    // If prosemirrorDelta is an array of operations
    if (Array.isArray(prosemirrorDelta)) {
      for (const op of prosemirrorDelta) {
        if (op.insert) {
          // Convert insert operations
          yDelta.push({ insert: op.insert });
        } else if (op.delete) {
          // Convert delete operations
          yDelta.push({ delete: op.delete });
        } else if (op.retain) {
          // Convert retain operations
          yDelta.push({ retain: op.retain });
        }
        // Add attributes if they exist
        if (op.attributes) {
          const lastOp = yDelta[yDelta.length - 1];
          if (lastOp) {
            lastOp.attributes = op.attributes;
          }
        }
      }
    } else if (typeof prosemirrorDelta === 'object') {
      // If it's a single operation object
      return [prosemirrorDelta];
    }
    
    return yDelta;
  }
  
  // Alternative approach: If you're using prosemirror-y-binding or a similar library
  // You might want to use their built-in conversion functions instead


  module.exports = router;
