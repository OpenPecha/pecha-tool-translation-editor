const express = require("express");
const authenticate = require("../middleware/authenticate");
const { PrismaClient } = require("@prisma/client");
const Y = require('yjs')
const moment = require("moment")
const multer = require('multer');
const fs = require('fs').promises;

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

module.exports = (getYDoc, client) => {

  // Create a new document
  router.post("/", authenticate, upload.single("file"), async (req, res) => {
    try {
      const { identifier ,isRoot, rootId } = req.body;
      if (!identifier) return res.status(400).json({ error: "Missing identifier in query params" });
      
      const doc = getYDoc(identifier, req.user.id);
      // Update the Y.doc with file content
      const ytext = doc.getText(identifier);
      if(req?.file){
        const textContent = req.file.buffer.toString("utf-8");
        if (textContent) {
          ytext.delete(0, ytext.length);
          ytext.insert(0, textContent);
        }
      }

      const state = Y.encodeStateAsUpdate(doc);
      const delta = ytext.toDelta();

      const document = await prisma.doc.create({
        data: {
          identifier,
          ownerId: req.user.id,
          docs_y_doc_state: state,
          docs_prosemirror_delta: delta,
          isRoot:isRoot === 'true',
          rootId:rootId ?? null
        },
      });

      await prisma.permission.create({
        data: {
          docId: document.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
        },
      });

      await client.hSet(`${document.id}:info`, {
        created: moment().toISOString(),
        updated: moment().toISOString(),
      });

      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ error: "Error creating document: " + error });
    }
  });

  // Get all documents for the user
  router.get("/", authenticate, async (req, res) => {
    try {
      const documents = await prisma.doc.findMany({
        where: {
          AND: [
            { ownerId: req.user.id },
            { permissions: { some: { userId: req.user.id, canRead: true } } },
          ],
        },
        select:{
          id:true,
          identifier:true,
          ownerId:true,
          permissions:true,
          language:true,
          isRoot:true,
          translations:true,
          updatedAt:true,
          root:{
            select:{
              identifier:true
            }
          }
        },
        orderBy:{
          isRoot:'desc'
        }
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
    const document = await prisma.doc.findUnique({ where: { id: req.params.id },select:{
      id:true,
      identifier:true,
      ownerId:true,
      permissions:true,
      language:true,
      isRoot:true,
      translations:true,
      docs_prosemirror_delta:true
    } });

    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.ownerId !== req.user.id) {
      const permission = await prisma.permission.findFirst({
        where: { docId: document.id, userId: req.user.id, canRead: true },
      });
      if (!permission) return res.status(403).json({ error: "No access" });
    }

    // Decode Y.js state (if stored as Uint8Array) and convert to Delta
    let delta = [];
    if (document.docs_y_doc_state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.docs_y_doc_state);
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
      const document = await prisma.doc.findUnique({ where: { id: req.params.id } });
      if (!document) return res.status(404).json({ error: "Document not found" });
  
      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: { docId: document.id, userId: req.user.id, canWrite: true },
        });
        if (!permission) return res.status(403).json({ error: "No edit access" });
      }
  
      const updatedDocument = await prisma.doc.update({
        where: { id: document.id },
        data: { docs_prosemirror_delta, docs_y_doc_state },
      });
  
      await client.hSet(`${document.id}:info`, {
        updated: moment().toISOString(),
      });
  
      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ error: "Error updating document" });
    }
  });
  // delete a document
  router.delete("/:id", authenticate, async (req, res) => {
    try {
      const document = await prisma.doc.findUnique({ where: { id: req.params.id } });
      if (!document) return res.status(404).json({ error: "Document not found" });
  
      if (document.ownerId !== req.user.id) {
        return res.status(403).json({ error: "You do not have permission to delete this document" });
      }
  
      await prisma.doc.delete({ where: { id: document.id } });
      await prisma.permission.deleteMany({ where: { docId: document.id } });
      await client.del(`${document.id}:info`);
  
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error deleting document" });
    }
  });
 

  router.post("/:id/permissions", authenticate, async (req, res) => {
    let { email, canRead, canWrite } = req.body;
    const documentId = req.params.id;
    try {
      let user=await prisma.user.findFirst({where:{email}})
      if(!user) return res.status(404).json({ error: "User not found" });
      const userId = user.id;
      // Check if the document exists
      canRead = canRead === "true" || canRead === true;
      canWrite = canWrite === "true" || canWrite === true;
      const document = await prisma.doc.findUnique({ where: { id: documentId } });
      if (!document) return res.status(404).json({ error: "Document not found" });
      // Ensure the requesting user is the owner of the document
      if (document.ownerId !== req.user.id) {
        return res.status(403).json({ error: "You do not have permission to modify this document" });
      }
  
      // Check if the user already has permissions
      const existingPermission = await prisma.permission.findFirst({
        where: { docId: documentId, userId }
      });
  
      if (existingPermission) {
        // Update existing permission
        await prisma.permission.update({
          where: { id: existingPermission.id },
          data: { canRead, canWrite }
        });
      } else {
        // Create a new permission entry
        try{

          await prisma.permission.create({
            data: { docId: documentId, userId, canRead, canWrite }
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: "user doesnt exist" });
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
      const { rootId, isRoot, translations } = req.body;
      const documentId = req.params.id;

      // Check if the document exists
      const document = await prisma.doc.findUnique({ 
        where: { id: documentId },
        include: { 
          root: true,
          translations: true
        }
      });
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Check permissions
      if (document.ownerId !== req.user.id) {
        const permission = await prisma.permission.findFirst({
          where: { docId: documentId, userId: req.user.id, canWrite: true },
        });
        if (!permission) {
          return res.status(403).json({ error: "No edit access" });
        }
      }

      // Validate the request
      if (rootId && isRoot) {
        return res.status(400).json({ 
          error: "A document cannot be both a root and a translation" 
        });
      }

      // If translations array is provided and document is not a root, reject
      if (translations && !document.isRoot && !isRoot) {
        return res.status(400).json({ 
          error: "Only root documents can have translations" 
        });
      }

      // If rootId is provided, verify it exists
      if (rootId) {
        const rootDoc = await prisma.doc.findUnique({ 
          where: { id: rootId }
        });

        if (!rootDoc) {
          return res.status(404).json({ error: "Root document not found" });
        }

        if (!rootDoc.isRoot) {
          return res.status(400).json({ 
            error: "Target document is not a root document" 
          });
        }
      }

      // If translations array is provided, verify all documents exist
      if (translations && Array.isArray(translations)) {
        const translationDocs = await prisma.doc.findMany({
          where: {
            id: {
              in: translations
            }
          }
        });

        if (translationDocs.length !== translations.length) {
          return res.status(400).json({ 
            error: "One or more translation documents not found" 
          });
        }

        // Check if any of these documents are roots or already translations
        const invalidDocs = translationDocs.filter(doc => 
          doc.isRoot || doc.rootId !== null
        );

        if (invalidDocs.length > 0) {
          return res.status(400).json({ 
            error: "Some documents are already roots or translations",
            invalidDocs: invalidDocs.map(d => d.id)
          });
        }
      }

      // Prepare the update data
      const updateData = {
        rootId: rootId || null,
        isRoot: isRoot ?? (rootId ? false : document.isRoot)
      };

      // Update the document and its translations in a transaction
      const updatedDocument = await prisma.$transaction(async (tx) => {
        // Update the main document
        const updated = await tx.doc.update({
          where: { id: documentId },
          data: updateData,
          include: {
            root: true,
            translations: true
          }
        });

        // If translations array is provided and document is/will be a root,
        // update all translation documents
        if (translations && Array.isArray(translations) && (document.isRoot || isRoot)) {
          await tx.doc.updateMany({
            where: {
              id: {
                in: translations
              }
            },
            data: {
              rootId: documentId,
              isRoot: false
            }
          });

          // Fetch the updated document with all relationships
          return await tx.doc.findUnique({
            where: { id: documentId },
            include: {
              root: true,
              translations: true
            }
          });
        }

        return updated;
      });

      res.json({
        success: true,
        data: updatedDocument
      });
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
