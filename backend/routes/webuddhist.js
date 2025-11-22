const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * POST /webuddhist
 * @summary Create a new WebuddhistThread and Webuddhist entry
 * @tags Webuddhist - Webuddhist management operations
 * @param {object} request.body.required - Webuddhist information - application/json
 * @param {string} request.body.email.required - Email address - eg: user@example.com
 * @param {string} request.body.question.required - Question text - eg: What is the meaning?
 * @param {object} request.body.response - Response JSON (optional) - eg: []
 * @param {string} request.body.threadId - Thread ID (optional) - If provided and exists, uses existing thread; otherwise creates new thread - eg: thread-uuid
 * @return {object} 201 - Created thread and webuddhist entry
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 * @example request - Example request body
 * {
 *   "email": "user@example.com",
 *   "question": "What is the meaning of this text?",
 *   "response": [],
 *   "threadId": "thread-uuid"
 * }
 */
router.post("/", async (req, res) => {
  try {
    const { email, question, response, threadId } = req.body;

    if (!email || !question) {
      return res.status(400).json({ error: "Email and question are required" });
    }

    // Create both WebuddhistThread and Webuddhist in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let thread;

      // If threadId is provided, try to find existing thread, otherwise create new one
      if (threadId) {
        thread = await tx.webuddhistThread.findUnique({
          where: { id: threadId },
        });

        // If thread doesn't exist, create a new one with the provided ID
        if (!thread) {
          thread = await tx.webuddhistThread.create({
            data: { id: threadId },
          });
        }
      } else {
        // No threadId provided, create a new thread
        thread = await tx.webuddhistThread.create({
          data: {},
        });
      }

      // Create the webuddhist entry and connect it to the thread
      const webuddhist = await tx.webuddhist.create({
        data: {
          email,
          question,
          response: response || [],
          webuddhistThreadId: {
            connect: { id: thread.id },
          },
        },
      });

      // Fetch the thread with relations
      const updatedThread = await tx.webuddhistThread.findUnique({
        where: { id: thread.id },
        include: {
          webuddhistResponseId: true,
        },
      });

      // Fetch the webuddhist with relations
      const updatedWebuddhist = await tx.webuddhist.findUnique({
        where: { id: webuddhist.id },
        include: {
          webuddhistThreadId: true,
        },
      });

      return {
        thread: updatedThread.id,
        webuddhist: updatedWebuddhist,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating webuddhist thread:", error);
    res.status(500).json({ error: "Error creating webuddhist thread" });
  }
});

module.exports = router;
