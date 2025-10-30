const express = require("express");
const { sendEmail, verifyEmailAddress } = require("../services/utils");
const router = express.Router();

/**
 * POST /send-email
 * @summary Send email to specified recipients
 * @tags Email - Email sending operations
 * @param {object} request.body.required - Email information
 * @param {array<string>} request.body.emails.required - Array of recipient email addresses
 * @param {object} request.body.message.required - Email message content
 * @param {string} request.body.message.subject.required - Email subject line
 * @param {string} request.body.message.text.required - Email body text content
 * @param {boolean} request.body.verifyEmails - Whether to verify email addresses before sending (default: false)
 * @return {object} 200 - Email sent successfully
 * @return {object} 400 - Bad request - Missing required fields or invalid email format
 * @return {object} 500 - Server error - Failed to send email
 * @example request - Send email request
 * {
 *   "emails": ["user@example.com", "admin@example.com"],
 *   "message": {
 *     "subject": "Welcome to Pecha Translation Editor",
 *     "text": "Thank you for joining our platform. We're excited to have you on board!"
 *   },
 *   "verifyEmails": false
 * }
 * @example response - 200 - Success response
 * {
 *   "success": true,
 *   "message": "Email sent successfully",
 *   "messageId": "0000014a-f4d4-4f36-b8d0-example",
 *   "recipients": ["user@example.com", "admin@example.com"]
 * }
 * @example response - 400 - Bad request response
 * {
 *   "success": false,
 *   "error": "Missing required fields",
 *   "details": "emails and message are required"
 * }
 * @example response - 500 - Server error response
 * {
 *   "success": false,
 *   "error": "Failed to send email",
 *   "details": "The email address is not verified. The following identities failed the check in region US-East-1: user@example.com"
 * }
 */
router.post("/send-email", async (req, res) => {
  try {
    const { emails, message, verifyEmails = false } = req.body;

    // Check if EMAIL_FROM environment variable is set
    if (!process.env.EMAIL_FROM) {
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
        details: "EMAIL_FROM environment variable is not configured",
      });
    }

    // Validate required fields
    if (!emails || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: "emails and message are required",
      });
    }

    // Validate emails array
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid emails format",
        details: "emails must be a non-empty array",
      });
    }

    // Validate message object
    if (!message.subject || !message.text) {
      return res.status(400).json({
        success: false,
        error: "Invalid message format",
        details: "message must contain both subject and text fields",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
        details: `Invalid email addresses: ${invalidEmails.join(", ")}`,
      });
    }

    // Verify email addresses if requested
    if (verifyEmails) {
      try {
        await verifyEmailAddress(emails);
      } catch (verificationError) {
        console.error("Email verification failed:", verificationError);
        return res.status(400).json({
          success: false,
          error: "Email verification failed",
          details: verificationError.message,
        });
      }
    }

    // Send email
    const result = await sendEmail(emails, message);

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: result.MessageId,
      recipients: emails,
    });
  } catch (error) {
    console.error("Error sending email:", error);

    // Handle specific AWS SES errors
    let errorMessage = "Failed to send email";
    let statusCode = 500;

    if (error.code === "MessageRejected") {
      errorMessage = "Email rejected by AWS SES";
      statusCode = 400;
    } else if (error.code === "InvalidParameterValue") {
      errorMessage = "Invalid email parameters";
      statusCode = 400;
    } else if (error.code === "ConfigurationSetDoesNotExistException") {
      errorMessage = "Email configuration error";
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
});

/**
 * POST /verify-email
 * @summary Verify email addresses with AWS SES
 * @tags Email - Email sending operations
 * @param {object} request.body.required - Email verification information
 * @param {array<string>} request.body.emails.required - Array of email addresses to verify
 * @return {object} 200 - Email addresses verified successfully
 * @return {object} 400 - Bad request - Missing required fields or invalid email format
 * @return {object} 500 - Server error - Failed to verify email addresses
 * @example request - Verify email addresses request
 * {
 *   "emails": ["user@example.com", "admin@example.com"]
 * }
 * @example response - 200 - Success response
 * {
 *   "success": true,
 *   "message": "Email addresses verified successfully",
 *   "verifiedEmails": ["user@example.com", "admin@example.com"]
 * }
 * @example response - 400 - Bad request response
 * {
 *   "success": false,
 *   "error": "Missing required fields",
 *   "details": "emails array is required"
 * }
 * @example response - 500 - Server error response
 * {
 *   "success": false,
 *   "error": "Failed to verify email addresses",
 *   "details": "Email address verification failed for: user@invalid-domain.com"
 * }
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { emails } = req.body;

    // Validate required fields
    if (!emails) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: "emails array is required",
      });
    }

    // Validate emails array
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid emails format",
        details: "emails must be a non-empty array",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
        details: `Invalid email addresses: ${invalidEmails.join(", ")}`,
      });
    }

    const result = await verifyEmailAddress(emails);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: "Failed to verify email addresses",
        details: "Email address verification failed",
      });
    }
    res.status(200).json({
      success: true,
      message: "Email addresses verified successfully",
      verifiedEmails: emails,
    });
  } catch (error) {
    console.error("Error verifying email:", error);

    res.status(500).json({
      success: false,
      error: "Failed to verify email addresses",
      details: error.message,
    });
  }
});

module.exports = router;
