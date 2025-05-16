/**
 * This file contains Swagger documentation for endpoints that are not already documented
 * in their respective route files. You can copy these JSDoc comments to the appropriate
 * route files to complete the API documentation.
 */

// ==================== COMMENTS ROUTES ====================

/**
 * GET /comments
 * @summary Get all comments with optional document filter
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} docId.query - Optional document ID to filter comments
 * @return {array<object>} 200 - List of comments
 * @return {object} 500 - Server error
 */

/**
 * GET /comments/{docId}
 * @summary Get all comments for a specific document
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} docId.path.required - Document ID
 * @return {array<object>} 200 - List of comments for the document
 * @return {object} 500 - Server error
 */

/**
 * GET /comments/thread/{threadId}
 * @summary Get all comments for a specific thread
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} threadId.path.required - Thread ID
 * @return {array<object>} 200 - List of comments in the thread
 * @return {object} 500 - Server error
 */

/**
 * POST /comments
 * @summary Create a new comment
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {object} request.body.required - Comment information
 * @param {string} request.body.docId.required - Document ID
 * @param {string} request.body.userId.required - User ID
 * @param {string} request.body.content.required - Comment content
 * @param {string} request.body.parentCommentId - Parent comment ID for nested comments
 * @param {integer} request.body.initial_start_offset.required - Start offset in the document
 * @param {integer} request.body.initial_end_offset.required - End offset in the document
 * @param {string} request.body.threadId - Thread ID for grouped comments
 * @param {string} request.body.comment_on.required - What the comment is on (e.g., "text", "translation")
 * @param {boolean} request.body.is_suggestion - Whether this is a suggestion
 * @param {string} request.body.suggested_text - Suggested text if is_suggestion is true
 * @return {object} 201 - Created comment
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 */

/**
 * PUT /comments/{id}
 * @summary Update a comment
 * @tags Comments - Comment management operations
 * @security BearerAuth
 * @param {string} id.path.required - Comment ID
 * @param {object} request.body.required - Updated comment information
 * @param {string} request.body.content - Updated comment content
 * @param {boolean} request.body.is_suggestion - Whether this is a suggestion
 * @param {string} request.body.suggested_text - Updated suggested text
 * @return {object} 200 - Updated comment
 * @return {object} 404 - Comment not found
 * @return {object} 400 - Bad request - Missing required fields for suggestions
 * @return {object} 500 - Server error
 */

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

// ==================== VERSIONS ROUTES ====================

/**
 * GET /versions/{docId}
 * @summary Get all versions for a specific document
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} docId.path.required - Document ID
 * @return {array<object>} 200 - List of versions
 * @return {object} 500 - Server error
 */

/**
 * POST /versions
 * @summary Create a new version
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {object} request.body.required - Version information
 * @param {string} request.body.docId.required - Document ID
 * @param {string} request.body.label.required - Version label
 * @param {object} request.body.content.required - Document content (Delta format)
 * @return {object} 201 - Created version
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 */

/**
 * GET /versions/version/{id}
 * @summary Get a specific version by ID
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID
 * @return {object} 200 - Version details
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */

/**
 * DELETE /versions/version/{id}
 * @summary Delete a specific version
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID
 * @return {object} 200 - Success message
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */

/**
 * PATCH /versions/version/{id}
 * @summary Update a version label
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID
 * @param {object} request.body.required - Updated version information
 * @param {string} request.body.label.required - New version label
 * @return {object} 200 - Updated version
 * @return {object} 400 - Bad request - Label is required
 * @return {object} 500 - Server error
 */

// ==================== TEXTS ROUTES ====================

/**
 * POST /texts/root
 * @summary Create a new root text
 * @tags Texts - Text management operations
 * @security BearerAuth
 * @param {object} request.body.required - Root text information
 * @param {string} request.body.title.required - Text title
 * @param {object} request.body.content - Text content (optional)
 * @param {string} request.body.language.required - Text language
 * @return {object} 200 - Created root text
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 */

/**
 * GET /texts/root
 * @summary Get all root texts
 * @tags Texts - Text management operations
 * @return {object} 200 - List of root texts with their translations
 * @return {object} 500 - Server error
 */

/**
 * GET /texts/root/{id}
 * @summary Get a specific root text with its translations
 * @tags Texts - Text management operations
 * @param {string} id.path.required - Root text ID
 * @return {object} 200 - Root text with translations
 * @return {object} 404 - Root text not found
 * @return {object} 500 - Server error
 */

/**
 * POST /texts/translation
 * @summary Create a translation for a root text
 * @tags Texts - Text management operations
 * @security BearerAuth
 * @param {object} request.body.required - Translation information
 * @param {string} request.body.rootId.required - Root text ID
 * @param {string} request.body.title.required - Translation title
 * @param {object} request.body.content - Translation content (optional)
 * @param {string} request.body.language.required - Translation language
 * @return {object} 200 - Created translation
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 404 - Root text not found
 * @return {object} 500 - Server error
 */

/**
 * GET /texts/translations/{rootId}
 * @summary Get all translations for a root text
 * @tags Texts - Text management operations
 * @param {string} rootId.path.required - Root text ID
 * @return {object} 200 - List of translations
 * @return {object} 500 - Server error
 */

/**
 * GET /texts/version-diff/{versionId}
 * @summary Get diff between current and previous version
 * @tags Texts - Text management operations
 * @param {string} versionId.path.required - Version ID
 * @return {object} 200 - Diff between versions
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */

// ==================== PROJECT ROUTES ====================

/**
 * POST /projects
 * @summary Create a new project
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {object} request.body.required - Project information
 * @param {string} request.body.name.required - Project name
 * @param {string} request.body.description - Project description
 * @return {object} 201 - Created project
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 */

/**
 * GET /projects/{id}
 * @summary Get a specific project by ID
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @return {object} 200 - Project details
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */

/**
 * PUT /projects/{id}
 * @summary Update a project
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {object} request.body.required - Updated project information
 * @param {string} request.body.name - Updated project name
 * @param {string} request.body.description - Updated project description
 * @param {string} request.body.status - Updated project status
 * @return {object} 200 - Updated project
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */

/**
 * DELETE /projects/{id}
 * @summary Delete a project
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @return {object} 200 - Success message
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */

/**
 * POST /projects/{id}/roots
 * @summary Add a root document to a project
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {object} request.body.required - Root document information
 * @param {string} request.body.name.required - Document name
 * @param {string} request.body.language.required - Document language
 * @param {object} request.body.content - Document content (optional)
 * @return {object} 201 - Root document added to project
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */

/**
 * GET /projects/{id}/export
 * @summary Export all project documents as a ZIP file
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {string} format.query - Export format (txt, docx, html)
 * @return {file} 200 - ZIP file containing all project documents
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */

/**
 * GET /projects/{id}/roots
 * @summary Get all root documents in a project
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @return {array<object>} 200 - List of root documents
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */

/**
 * GET /projects/{id}/roots/{rootId}/export
 * @summary Export a specific root document with its translations
 * @tags Projects - Project management operations
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {string} rootId.path.required - Root document ID
 * @param {string} format.query - Export format (txt, docx, html)
 * @return {file} 200 - File containing the document and translations
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Project or document not found
 * @return {object} 500 - Server error
 */

