const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  authenticate,
  optionalAuthenticate,
} = require("../middleware/authenticate");
const { sendEmail } = require("../services/utils");
const { getSegmentsContent } = require("../apis/openpecha_api");
const { getSegmentRelated } = require("../apis/openpecha_api");
const prisma = new PrismaClient();
const router = express.Router();

//references = [{type: "commentary", content: "The content of the reference"}]
//messages = [{role: "user", content: "kunsang:@Comment Please analyze this text"},{role: "assistant", content: "The content of the assistant's message"},{role: "user", content: "tashi: The content of the user's message"}]

// Function to generate messages from thread comment history
async function generateMessagesFromThread(threadId, selectedText) {
  if (!threadId) {
    return [];
  }

  try {

    // Fetch thread with comments in a single query
    const thread = await prisma.thread.findFirst({
      where: { id: threadId },
      select: {
        selectedText: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    let messages = [];
    
    // Add selected text as initial message if it exists
    if (thread?.selectedText) {
      messages.push({
        role: "user",
        content: thread.selectedText,
      });
    }

    // Convert comments to messages format
    if (thread?.comments) {
      messages.push(...thread.comments.map((comment) => ({
        role: comment.isSystemGenerated ? "assistant" : "user",
        content: comment.content,
      })));
    }

    return messages;
  } catch (error) {
    console.error("Error generating messages from thread:", error);
    return [];
  }
}

// AI Comment function
async function getAIComment(threadId, selectedText, res, model_name, content, references) {
  try {
    // Generate messages from thread history
    const messages = await generateMessagesFromThread(threadId, selectedText);

    if (content) {
      messages.push({
        role: "user",
        content: content.replace(/@ai/g, "@Comment").trim(),
      });
    }
    const requestBody = {
      messages,
      references,
      options: {
        // model_name,
        require_full_justification: true,
        mention_scope: "last",
        max_mentions: 5,
      },
    };
    const url = process.env.TRANSLATE_API_URL + "/editor/comment/stream";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status}`);
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Content-Encoding": "none", // Disable compression
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalCommentText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); 
      for (const line of lines) {
				if (line.startsWith("data:")) {
					const jsonStartIndex = line.indexOf("{");
					if (jsonStartIndex !== -1) {
						const jsonString = line.substring(jsonStartIndex);
						try {
							const parsed = JSON.parse(jsonString);
							if (parsed.type === "comment_delta") {
								finalCommentText += parsed.text || "";
							} else if(parsed.type === "completion"){
                finalCommentText = parsed.comment_text || parsed.text;
                // Trim "@Comment " prefix if present
                if (finalCommentText && finalCommentText.startsWith("@Comment ")) {
                  finalCommentText = finalCommentText.substring(9); // Remove "@Comment " (9 characters)
                }
              } else if (parsed.type === "error") {
								console.error("Error:", parsed.message || "An unknown error occurred");
							}
							// Properly serialize JSON to avoid escaping issues with special characters
							const responseData = {
								type: parsed?.type,
								text: parsed?.text || parsed?.comment_text || parsed?.message
							};
							const dataString = `data: ${JSON.stringify(responseData)}\n\n`;
							res.write(dataString);
							// Force flush to ensure immediate delivery
							if (res.flush) res.flush();
						} catch (e) {
							console.error("Failed to parse stream data:", e);	
						}
					}
				}
			}
    }

    // Return the final comment text for database storage
    return finalCommentText;
  } catch (error) {
    console.error("Error calling AI comment API:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: "Failed to get AI comment" })}\n\n`
    );
    throw error;
  }
}

// Function to extract mentions from content
function extractMentions(content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

// Function to send mention notifications
async function sendMentionNotifications(
  mentionedUserIds,
  content,
  selectedText,
  currentUser
) {

  const currentUserInfo = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });
  for (const userId of mentionedUserIds) {
    if (userId === "ai") continue; // Skip AI mentions

    try {
      // Find user by username
      const mentionedUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (mentionedUser) {
        const emailContent = {
          subject: `You were mentioned in a comment - Pecha Translation Editor`,
          text: `Hello ${mentionedUser.username || ""},\n\nYou were mentioned in a comment by ${currentUserInfo.username} on Pecha Translation Editor.\n\n
Comment: "${content}"
${selectedText ? `Selected text: "${selectedText}"\n\n` : ""}You can view and respond to this comment in the document editor.

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
        };
      
        await sendEmail([mentionedUser.email], emailContent);
      }
      
    } catch (error) {
      console.error(
        `Error sending mention notification to @${userId}:`,
        error
      );
    }
  }
}

/**
 * GET /comments
 * @summary Get all comments with optional document filter
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} docId.query - Optional document ID to filter comments
 * @return {array<object>} 200 - List of comments
 * @return {object} 500 - Server error
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { docId } = req.query;

    let comments;
    if (docId) {
      comments = await prisma.comment.findMany({
        where: { docId },
        include: { user: true },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      comments = await prisma.comment.findMany({
        include: { user: true },
      });
    }

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while fetching comments" });
  }
});

/**
 * GET /comments/{docId}
 * @summary Get all comments for a specific document
 * @tags Comments - Comment management operations
 * @param {string} docId.path.required - Document ID
 * @return {array<object>} 200 - List of comments for the document
 * @return {object} 500 - Server error
 */
router.get("/:docId", optionalAuthenticate, async (req, res) => {
  try {
    const { docId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { docId },
      include: { user: true },
    });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching document comments" });
  }
});
/**
 * GET /comments/thread/{threadId}
 * @summary Get all comments for a specific thread
 * @tags Comments - Comment management operations
 * @param {string} threadId.path.required - Thread ID
 * @return {array<object>} 200 - List of comments in the thread
 * @return {object} 500 - Server error
 */
router.get("/thread/:threadId", optionalAuthenticate, async (req, res) => {
  const { threadId } = req.params;
  const comments = await prisma.comment.findMany({
    where: { threadId },
    include: { user: true },
    orderBy: {
      createdAt: "desc",
    },
  });
  res.json(comments);
});
/**
 * POST /comments
 * @summary Create a new comment
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {object} request.body.required - Comment information - application/json
 * @param {string} request.body.docId.required - Document ID - eg: doc-123
 * @param {string} request.body.userId.required - User ID - eg: user-456
 * @param {string} request.body.content.required - Comment text content - eg: This is my comment
 * @param {string} request.body.threadId.required - Thread ID that this comment belongs to - eg: thread-789
 * @param {boolean} request.body.isSuggestion - Whether this is a suggestion (default: false) - eg: false
 * @param {string} request.body.suggestedText - Suggested text if isSuggestion is true - eg: Corrected text here
 * @param {boolean} request.body.isSystemGenerated - Whether this comment was system-generated (default: false) - eg: false
 * @param {string} request.body.selectedText - Selected text that the comment is about - eg: Selected text content
 * @return {object} 201 - Created comment with user information
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 * @example request - Example regular comment
 * {
 *   "docId": "doc-123",
 *   "userId": "user-456",
 *   "content": "This is my comment on the selected text",
 *   "threadId": "thread-789",
 *   "isSuggestion": false,
 *   "suggestedText": null,
 *   "isSystemGenerated": false,
 *   "selectedText": "The text that was selected for commenting"
 * }
 * @example request - Example AI comment request
 * {
 *   "docId": "doc-123",
 *   "userId": "user-456",
 *   "content": "@ai_comment Please analyze this text",
 *   "threadId": "thread-789",
 *   "selectedText": "Text to be analyzed by AI"
 * }
 * @example request - Example mention comment
 * {
 *   "docId": "doc-123",
 *   "userId": "user-456",
 *   "content": "@john_doe What do you think about this?",
 *   "threadId": "thread-789",
 *   "selectedText": "Text being discussed"
 * }
 * @example response - 201 - Success response
 * {
 *   "id": "comment-abc",
 *   "docId": "doc-123",
 *   "userId": "user-456",
 *   "threadId": "thread-789",
 *   "content": "This is my comment on the selected text",
 *   "isSuggestion": false,
 *   "suggestedText": null,
 *   "isSystemGenerated": false,
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z",
 *   "user": {
 *     "id": "user-456",
 *     "username": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      docId,
      userId,
      content,
      threadId,
      isSuggestion,
      suggestedText,
      isSystemGenerated,
      selectedText,
      mentionedUserIds,
    } = req.body;
    if (!docId || !userId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate suggestion data if isSuggestion is true
    if (isSuggestion === true && !suggestedText) {
      return res
        .status(400)
        .json({ error: "Suggested text is required for suggestions" });
    }

    // Always create the user's comment first
    const newComment = await prisma.comment.create({
      data: {
        docId,
        userId,
        content,
        threadId: threadId,
        isSuggestion: isSuggestion || false,
        suggestedText: suggestedText || null,
        isSystemGenerated: isSystemGenerated || false,
      },
      include: { user: true },
    });

    // Send mention notifications (excluding AI mentions)
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const regularMentions = mentionedUserIds.filter(
        (id) => id !== "ai"
      );
      if (regularMentions.length > 0) {
        await sendMentionNotifications(
          regularMentions,
          content,
          selectedText,
          req.user
        );
      }
    }

    // Check if this is an AI comment request AFTER saving the user's comment
    if (content.includes("@ai")) {
      const offset = await prisma.thread.findFirst({
        where : {id:threadId}
      })
      const instance = await prisma.docMetadata.findFirst({
        where:{docId:docId},
        select:{
          instanceId:true
        }
      })
      const relatedSegments = await getSegmentRelated(instance.instanceId, offset.initialStartOffset, offset.initialEndOffset);
      let references = [];
      const segmentDetails = relatedSegments.map(item => {
        return {
        type: item.text.type,
        instance_id: item.instance.id,
        seg_ids: item.segments.map(seg => seg.id).join(',')}
      });

      for (const segmentDetail of segmentDetails) {
        const segmentContent = await getSegmentsContent(segmentDetail.instance_id, segmentDetail.seg_ids);
        references.push({
          type: segmentDetail.type,
          content: segmentContent.map(item => item.content).join('')
        })
      }
      try {
        // Stream AI response to client
        const aiCommentText = await getAIComment(
          threadId,
          selectedText,
          res,
          null,
          content,
          references
        );
        // After streaming is complete, save the AI comment to the database
        const aiComment = await prisma.comment.create({
          data: {
            docId,
            userId, // This should ideally be a dedicated AI user ID
            content: aiCommentText,
            threadId: newComment.threadId,
            isSuggestion: false,
            suggestedText: null,
            isSystemGenerated: true,
            references: references,
          },
          include: { user: true },
        });

        // Send final completion event with the saved AI comment
        res.write(
          `data: ${JSON.stringify({ type: "saved_comment", comment: aiComment })}\n\n`
        );
        res.end();
      } catch (error) {
        console.error("Error processing AI comment:", error);
        // Still end the response stream properly on error
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to process AI comment" }));
        } else {
          res.write(
            `data: ${JSON.stringify({ type: "error", message: "Failed to process AI comment" })}\n\n`
          );
          res.end();
        }
      }
    } else {
      // If not an AI comment, send the created comment back as JSON
      res.status(201).json(newComment);
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error creating comment" });
    }
  }
});

/**
 * PUT /comments/{id}
 * @summary Update a comment
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} id.path.required - Comment ID
 * @param {object} request.body.required - Updated comment information
 * @param {string} request.body.content - Updated comment content
 * @param {boolean} request.body.isSuggestion - Whether this is a suggestion
 * @param {string} request.body.suggestedText - Updated suggested text
 * @return {object} 200 - Updated comment
 * @return {object} 404 - Comment not found
 * @return {object} 400 - Bad request - Missing required fields for suggestions
 * @return {object} 500 - Server error
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isSuggestion, suggestedText } = req.body;

    const existingComment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Validate suggestion data if isSuggestion is being updated to true
    if (
      isSuggestion === true &&
      !suggestedText &&
      !existingComment.suggestedText
    ) {
      return res
        .status(400)
        .json({ error: "Suggested text is required for suggestions" });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        content,
        isSuggestion:
          isSuggestion !== undefined
            ? isSuggestion
            : existingComment.isSuggestion,
        suggestedText:
          suggestedText !== undefined
            ? suggestedText
            : existingComment.suggestedText,
        updatedAt: new Date(),
      },
    });

    res.json(updatedComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating comment" });
  }
});

/**
 * DELETE /comments/{id}
 * @summary Delete a comment
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} id.path.required - Comment ID
 * @return {object} 200 - Success message
 * @return {object} 404 - Comment not found
 * @return {object} 500 - Server error
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting comment" });
  }
});

module.exports = router;
