/**
 * Email template utility functions
 * Contains standardized email templates for various notifications
 */

/**
 * Get the base URL for the application
 * @returns {string} The workspace URL or default message
 */
const getWorkspaceUrl = () => {
  return process.env.WORKSPACE_URL || "the platform";
};

/**
 * Template for document sharing notification
 * @param {Object} params - Template parameters
 * @param {string} params.documentName - Name of the document being shared
 * @param {string} params.accessType - Type of access granted ('view' or 'edit')
 * @param {string} params.sharedBy - Name/email of the person sharing (optional)
 * @returns {Object} Email message object with subject and text
 */
const documentSharedTemplate = ({ documentName, accessType, sharedBy }) => {
  const sharedByText = sharedBy ? ` by ${sharedBy}` : "";

  return {
    subject: "Document Shared with You - Pecha Translation Editor",
    text: `Hello,

A document has been shared with you${sharedByText} on Pecha Translation Editor.

Document: "${documentName}"
Access Level: ${
      accessType === "edit"
        ? "Editor (can view and edit)"
        : "Viewer (read-only)"
    }

You can access the document at: ${getWorkspaceUrl()}

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
  };
};

/**
 * Template for project sharing notification
 * @param {Object} params - Template parameters
 * @param {string} params.projectName - Name of the project being shared
 * @param {string} params.accessLevel - Access level granted ('viewer', 'editor', or 'admin')
 * @param {string} params.sharedBy - Name/email of the person sharing (optional)
 * @returns {Object} Email message object with subject and text
 */
const TranslationEditorURL = "https://translation.buddhistai.tools";
const projectSharedTemplate = ({ projectName, accessLevel, sharedBy }) => {
  const sharedByText = sharedBy ? ` by ${sharedBy}` : "";

  // Map access levels to descriptions
  const accessDescriptions = {
    viewer: "Viewer (can view project contents)",
    editor: "Editor (can view and edit project contents)",
    admin: "Admin (full access to project)",
  };

  const accessDescription = accessDescriptions[accessLevel] || accessLevel;

  return {
    subject: "Project Shared with You - Pecha Translation Editor",
    text: `Hello,

A project has been shared with you${sharedByText} on Pecha Translation Editor.

Project: "${projectName}"
Access Level: ${accessDescription}

You can access the project at: ${getWorkspaceUrl()}

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
  };
};

/**
 * Template for project permission update notification
 * @param {Object} params - Template parameters
 * @param {string} params.projectName - Name of the project
 * @param {string} params.accessLevel - New access level
 * @returns {Object} Email message object with subject and text
 */
const projectPermissionUpdatedTemplate = ({ projectName, accessLevel }) => {
  const accessDescriptions = {
    viewer: "Viewer (can view project contents)",
    editor: "Editor (can view and edit project contents)",
    admin: "Admin (full access to project)",
  };

  const accessDescription = accessDescriptions[accessLevel] || accessLevel;

  return {
    subject: "Project Access Updated - Pecha Translation Editor",
    text: `Hello,

Your access level for a project has been updated on Pecha Translation Editor.

Project: "${projectName}"
New Access Level: ${accessDescription}

You can access the project at: ${TranslationEditorURL}

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
  };
};

/**
 * Template for document permission removal notification
 * @param {Object} params - Template parameters
 * @param {string} params.documentName - Name of the document
 * @returns {Object} Email message object with subject and text
 */
const documentPermissionRemovedTemplate = ({ documentName }) => {
  return {
    subject: "Document Access Removed - Pecha Translation Editor",
    text: `Hello,

Your access to a document has been removed on Pecha Translation Editor.

Document: "${documentName}"

You will no longer be able to view or edit this document.

If you believe this was done in error, please contact the document owner.

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
  };
};

/**
 * Template for project permission removal notification
 * @param {Object} params - Template parameters
 * @param {string} params.projectName - Name of the project
 * @returns {Object} Email message object with subject and text
 */
const projectPermissionRemovedTemplate = ({ projectName }) => {
  return {
    subject: "Project Access Removed - Pecha Translation Editor",
    text: `Hello,

Your access to a project has been removed on Pecha Translation Editor.

Project: "${projectName}"

You will no longer be able to view or edit this project.

If you believe this was done in error, please contact the project owner.

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
  };
};

/**
 * Template for document permission update notification
 * @param {Object} params - Template parameters
 * @param {string} params.documentName - Name of the document
 * @param {string} params.accessType - New access type ('view' or 'edit')
 * @returns {Object} Email message object with subject and text
 */
const documentPermissionUpdatedTemplate = ({ documentName, accessType }) => {
  return {
    subject: "Document Access Updated - Pecha Translation Editor",
    text: `Hello,

Your access level for a document has been updated on Pecha Translation Editor.

Document: "${documentName}"
New Access Level: ${
      accessType === "edit"
        ? "Editor (can view and edit)"
        : "Viewer (read-only)"
    }

You can access the document at: ${getWorkspaceUrl()}

Thank you for using Pecha Translation Editor!

---
This is an automated message. Please do not reply to this email.`,
  };
};

module.exports = {
  documentSharedTemplate,
  projectSharedTemplate,
  projectPermissionUpdatedTemplate,
  documentPermissionRemovedTemplate,
  projectPermissionRemovedTemplate,
  documentPermissionUpdatedTemplate,
};
