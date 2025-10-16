import { useCallback } from "react";

// Define all trackable event types
export type UmamiEventType =
	// Annotation and comment events
	| "annotation-created"
	| "annotation-deleted"
	| "text-selected"
	| "comment-created"
	| "comment-deleted"
	| "footnote-created"
	| "footnote-deleted"

	// Task and document events
	| "task-submitted"
	| "task-skipped"
	| "task-reverted"
	| "document-created"
	| "document-opened"
	| "document-saved"
	| "document-published"
	| "document-exported"

	// Translation events
	| "translation-created"
	| "translation-selected"
	| "translation-synced"

	// Project events
	| "project-created"
	| "project-opened"
	| "project-edited"
	| "project-shared"
	| "project-deleted"

	// Navigation events
	| "page-visited"
	| "modal-opened"
	| "modal-closed"
	| "tab-changed"

	// User management events
	| "user-logged-in"
	| "user-logged-out"
	| "user-identified"
	| "user-role-changed"
	| "user-status-changed"
	| "user-deleted"

	// Bulk upload events
	| "bulk-upload-started"
	| "bulk-upload-completed"

	// Search events
	| "search-performed"
	| "search-result-selected"

	// UI interaction events
	| "button-clicked"
	| "sidebar-toggled"
	| "toolbar-action"
	| "editor-formatted"

	// Version control events
	| "version-created"
	| "version-restored"
	| "version-compared";

// Event properties interface
interface UmamiEventProperties {
	// Common properties
	user_id?: string;
	user_role?: string;
	page_path?: string;
	timestamp?: number;
	session_id?: string;

	// Annotation-specific properties
	annotation_type?: string;
	annotation_id?: string;
	text_id?: string;
	text_length?: number;
	selection_length?: number;

	// Task-specific properties
	task_id?: string;
	task_type?: string;
	annotations_count?: number;
	task_duration?: number;
	completion_status?: string;

	// Navigation properties
	from_page?: string;
	to_page?: string;
	navigation_type?: string;

	// User management properties
	target_user_id?: string;
	old_role?: string;
	new_role?: string;
	old_status?: string;
	new_status?: string;

	// Bulk upload properties
	files_count?: number;
	successful_files?: number;
	failed_files?: number;
	total_annotations?: number;

	// Search properties
	search_query?: string;
	search_results_count?: number;
	search_type?: string;
	result_index?: number;

	// UI properties
	component_name?: string;
	action_type?: string;
	element_type?: string;
	element_id?: string;
	modal_type?: string;
	sidebar_type?: string;

	// Performance properties
	load_time?: number;
	response_time?: number;

	// Error properties
	error_message?: string;
	error_type?: string;

	// Additional context
	metadata?: Record<string, string | number | boolean | null>;
}

// Umami tracking function type
declare global {
	interface Window {
		umami?: {
			track: (
				event: string,
				properties?: Record<string, string | number | boolean | null>,
			) => void;
			identify: (
				userId: string,
				properties?: Record<string, string | number | boolean | null>,
			) => void;
		};
	}
}

/**
 * Custom hook for umami analytics tracking
 * Provides a clean interface for tracking user interactions
 */
export const useUmamiTracking = () => {
	const track = useCallback(
		(eventType: UmamiEventType, properties: UmamiEventProperties = {}) => {
			// Add default properties
			const defaultProperties: UmamiEventProperties = {
				timestamp: Date.now(),
				page_path: window.location.pathname,
				session_id: generateSessionId(),
				...properties,
			};

			// Track with umami if available
			if (window.umami?.track) {
				// Convert properties to the expected format
				const convertedProperties: Record<
					string,
					string | number | boolean | null
				> = {};
				Object.entries(defaultProperties).forEach(([key, value]) => {
					if (value !== undefined) {
						convertedProperties[key] = value;
					}
				});
				window.umami.track(eventType, convertedProperties);
			}
		},
		[],
	);

	// Annotation tracking methods
	const trackAnnotationCreated = useCallback(
		(
			annotationType: string,
			textId: string,
			selectionLength: number,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("annotation-created", {
				annotation_type: annotationType,
				text_id: textId,
				selection_length: selectionLength,
				...properties,
			});
		},
		[track],
	);

	const trackAnnotationDeleted = useCallback(
		(
			annotationId: string,
			annotationType: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("annotation-deleted", {
				annotation_id: annotationId,
				annotation_type: annotationType,
				...properties,
			});
		},
		[track],
	);

	const trackTextSelected = useCallback(
		(
			textLength: number,
			selectionLength: number,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("text-selected", {
				text_length: textLength,
				selection_length: selectionLength,
				...properties,
			});
		},
		[track],
	);

	// Task tracking methods
	const trackTaskSubmitted = useCallback(
		(
			taskId: string,
			annotationsCount: number,
			taskDuration: number,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("task-submitted", {
				task_id: taskId,
				annotations_count: annotationsCount,
				task_duration: taskDuration,
				completion_status: "completed",
				...properties,
			});
		},
		[track],
	);

	const trackTaskSkipped = useCallback(
		(
			taskId: string,
			reason?: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("task-skipped", {
				task_id: taskId,
				completion_status: "skipped",
				metadata: reason ? { reason } : undefined,
				...properties,
			});
		},
		[track],
	);

	const trackTaskReverted = useCallback(
		(
			taskId: string,
			annotationsCount: number,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("task-reverted", {
				task_id: taskId,
				annotations_count: annotationsCount,
				...properties,
			});
		},
		[track],
	);

	// Navigation tracking methods
	const trackPageVisit = useCallback(
		(
			pagePath: string,
			fromPage?: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("page-visited", {
				page_path: pagePath,
				from_page: fromPage,
				navigation_type: "page_change",
				...properties,
			});
		},
		[track],
	);

	const trackModalOpened = useCallback(
		(modalType: string, properties: Partial<UmamiEventProperties> = {}) => {
			track("modal-opened", {
				modal_type: modalType,
				...properties,
			});
		},
		[track],
	);

	const trackModalClosed = useCallback(
		(modalType: string, properties: Partial<UmamiEventProperties> = {}) => {
			track("modal-closed", {
				modal_type: modalType,
				...properties,
			});
		},
		[track],
	);

	// User management tracking methods
	const trackUserRoleChanged = useCallback(
		(
			targetUserId: string,
			oldRole: string,
			newRole: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("user-role-changed", {
				target_user_id: targetUserId,
				old_role: oldRole,
				new_role: newRole,
				...properties,
			});
		},
		[track],
	);

	const trackUserStatusChanged = useCallback(
		(
			targetUserId: string,
			oldStatus: string,
			newStatus: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("user-status-changed", {
				target_user_id: targetUserId,
				old_status: oldStatus,
				new_status: newStatus,
				...properties,
			});
		},
		[track],
	);

	const trackUserDeleted = useCallback(
		(targetUserId: string, properties: Partial<UmamiEventProperties> = {}) => {
			track("user-deleted", {
				target_user_id: targetUserId,
				...properties,
			});
		},
		[track],
	);

	// Bulk upload tracking methods
	const trackBulkUploadStarted = useCallback(
		(filesCount: number, properties: Partial<UmamiEventProperties> = {}) => {
			track("bulk-upload-started", {
				files_count: filesCount,
				...properties,
			});
		},
		[track],
	);

	const trackBulkUploadCompleted = useCallback(
		(
			filesCount: number,
			successfulFiles: number,
			failedFiles: number,
			totalAnnotations: number,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("bulk-upload-completed", {
				files_count: filesCount,
				successful_files: successfulFiles,
				failed_files: failedFiles,
				total_annotations: totalAnnotations,
				...properties,
			});
		},
		[track],
	);

	// Search tracking methods
	const trackSearchPerformed = useCallback(
		(
			searchQuery: string,
			searchResultsCount: number,
			searchType: string = "text",
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("search-performed", {
				search_query: searchQuery,
				search_results_count: searchResultsCount,
				search_type: searchType,
				...properties,
			});
		},
		[track],
	);

	const trackSearchResultSelected = useCallback(
		(
			resultIndex: number,
			searchQuery: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("search-result-selected", {
				result_index: resultIndex,
				search_query: searchQuery,
				...properties,
			});
		},
		[track],
	);

	// UI interaction tracking methods
	const trackSidebarToggled = useCallback(
		(
			sidebarType: string,
			isOpen: boolean,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("sidebar-toggled", {
				sidebar_type: sidebarType,
				metadata: { is_open: isOpen },
				...properties,
			});
		},
		[track],
	);

	const trackButtonClicked = useCallback(
		(
			buttonType: string,
			elementId?: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("button-clicked", {
				element_type: "button",
				action_type: buttonType,
				element_id: elementId,
				...properties,
			});
		},
		[track],
	);

	// Document tracking methods
	const trackDocumentCreated = useCallback(
		(
			documentId: string,
			documentType: string,
			projectId?: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("document-created", {
				text_id: documentId,
				task_type: documentType,
				metadata: projectId ? { project_id: projectId } : undefined,
				...properties,
			});
		},
		[track],
	);

	const trackDocumentOpened = useCallback(
		(
			documentId: string,
			documentType: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("document-opened", {
				text_id: documentId,
				task_type: documentType,
				...properties,
			});
		},
		[track],
	);

	const trackDocumentSaved = useCallback(
		(
			documentId: string,
			saveType: string = "auto",
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("document-saved", {
				text_id: documentId,
				action_type: saveType,
				...properties,
			});
		},
		[track],
	);

	// Project tracking methods
	const trackProjectCreated = useCallback(
		(
			projectId: string,
			projectName: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("project-created", {
				task_id: projectId,
				metadata: { project_name: projectName },
				...properties,
			});
		},
		[track],
	);

	const trackProjectOpened = useCallback(
		(
			projectId: string,
			projectName: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("project-opened", {
				task_id: projectId,
				metadata: { project_name: projectName },
				...properties,
			});
		},
		[track],
	);

	const trackProjectShared = useCallback(
		(
			projectId: string,
			shareType: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("project-shared", {
				task_id: projectId,
				action_type: shareType,
				...properties,
			});
		},
		[track],
	);

	// Translation tracking methods
	const trackTranslationCreated = useCallback(
		(
			translationId: string,
			sourceDocId: string,
			language: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("translation-created", {
				text_id: translationId,
				metadata: { source_doc_id: sourceDocId, language },
				...properties,
			});
		},
		[track],
	);

	const trackTranslationSelected = useCallback(
		(
			translationId: string,
			language: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("translation-selected", {
				text_id: translationId,
				metadata: { language },
				...properties,
			});
		},
		[track],
	);

	// Editor tracking methods
	const trackEditorFormatted = useCallback(
		(
			formatType: string,
			documentId: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("editor-formatted", {
				action_type: formatType,
				text_id: documentId,
				...properties,
			});
		},
		[track],
	);

	const trackToolbarAction = useCallback(
		(
			actionType: string,
			documentId: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("toolbar-action", {
				action_type: actionType,
				text_id: documentId,
				...properties,
			});
		},
		[track],
	);

	// Comment and footnote tracking methods
	const trackCommentCreated = useCallback(
		(
			commentId: string,
			documentId: string,
			commentType: string = "comment",
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("comment-created", {
				annotation_id: commentId,
				text_id: documentId,
				annotation_type: commentType,
				...properties,
			});
		},
		[track],
	);

	const trackFootnoteCreated = useCallback(
		(
			footnoteId: string,
			documentId: string,
			properties: Partial<UmamiEventProperties> = {},
		) => {
			track("footnote-created", {
				annotation_id: footnoteId,
				text_id: documentId,
				annotation_type: "footnote",
				...properties,
			});
		},
		[track],
	);

	// Authentication tracking methods
	const trackUserLogin = useCallback(
		(userId: string, properties: Partial<UmamiEventProperties> = {}) => {
			track("user-logged-in", {
				user_id: userId,
				...properties,
			});
		},
		[track],
	);

	const trackUserLogout = useCallback(
		(userId: string, properties: Partial<UmamiEventProperties> = {}) => {
			track("user-logged-out", {
				user_id: userId,
				...properties,
			});
		},
		[track],
	);

	return {
		track,
		trackAnnotationCreated,
		trackAnnotationDeleted,
		trackTextSelected,
		trackTaskSubmitted,
		trackTaskSkipped,
		trackTaskReverted,
		trackPageVisit,
		trackModalOpened,
		trackModalClosed,
		trackUserRoleChanged,
		trackUserStatusChanged,
		trackUserDeleted,
		trackBulkUploadStarted,
		trackBulkUploadCompleted,
		trackSearchPerformed,
		trackSearchResultSelected,
		trackSidebarToggled,
		trackButtonClicked,
		trackDocumentCreated,
		trackDocumentOpened,
		trackDocumentSaved,
		trackProjectCreated,
		trackProjectOpened,
		trackProjectShared,
		trackTranslationCreated,
		trackTranslationSelected,
		trackEditorFormatted,
		trackToolbarAction,
		trackCommentCreated,
		trackFootnoteCreated,
		trackUserLogin,
		trackUserLogout,
	};
};

// Helper function to generate session ID
function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get user context
export const getUserContext = (
	currentUser: { id?: string | number; role?: string } | null,
): Partial<UmamiEventProperties> => {
	if (!currentUser) return {};

	return {
		user_id: currentUser.id?.toString(),
		user_role: currentUser.role,
	};
};

// Helper function to measure performance
export const measurePerformance = (startTime: number): number => {
	return Date.now() - startTime;
};
