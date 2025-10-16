import { useState } from "react";
import {
	fetchDocument,
	fetchDocumentTranslations,
	fetchPublicDocument,
} from "../api/document";
import { useAuth } from "@/auth/use-auth-hook";
import { useQuery } from "@tanstack/react-query";
import { EDITOR_READ_ONLY } from "@/utils/editorConfig";

export interface Translation {
	id: string;
	language: string;
	name: string;
	updatedAt: string;
}

interface Permission {
	userId: string;
	canWrite: boolean;
	canRead: boolean;
}

export interface Document {
	id: string;
	name: string;
	identifier: string;
	created_at?: string;
	updated_at?: string;
	translations?: Translation[];
	rootProjectId?: string;
	currentVersion?: {
		id: string;
		content: {
			ops: Record<string, unknown>[];
		};
		createdAt: string;
		updatedAt: string;
		label: string;
		userId?: string;
	};
	rootProject?: {
		id?: string;
		name?: string;
		permissions?: Permission[];
	};
}

interface UseCurrentDocReturn {
	currentDoc: Document | null;
	loading: boolean;
	error: string | null;
	isEditable: boolean | undefined;
}

export const useCurrentDoc = (
	docId: string | undefined,
	isPublic: boolean = false,
): UseCurrentDocReturn => {
	const { currentUser } = useAuth();
	const [isEditable, setIsEditable] = useState<boolean | undefined>(undefined);
	const { data, isLoading, error } = useQuery({
		queryKey: [`document-${docId}`],
		queryFn: async () => {
			if (!docId) return null;
			const doc = isPublic
				? await fetchPublicDocument(docId)
				: await fetchDocument(docId);

			// For public documents, always set as not editable
			if (isPublic) {
				setIsEditable(false);
			}

			if (doc?.rootProject?.permissions && !EDITOR_READ_ONLY) {
				doc?.rootProject.permissions.map((permission: Permission) => {
					if (permission?.userId === currentUser?.id && permission?.canWrite) {
						setIsEditable(true);
					}
				});
			}
			return doc;
		},
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		enabled: !!docId,
		staleTime: 0,
	});
	return {
		currentDoc: data,
		loading: isLoading,
		error: error
			? error instanceof Error
				? error.message
				: "Failed to load document"
			: null,
		isEditable,
	};
};

/**
 * Hook to fetch and manage translations for a document
 * @param docId The ID of the document to fetch translations for
 * @returns Object containing translations data, loading state, and error
 */
export const useCurrentDocTranslations = (docId: string | undefined) => {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: [`translations-${docId}`],
		queryFn: async () => {
			if (!docId) return [];
			return await fetchDocumentTranslations(docId);
		},
		enabled: !!docId,
		staleTime: 0, // Always fetch fresh data
	});

	return {
		translations: data ?? [],
		loading: isLoading,
		error: error
			? error instanceof Error
				? error.message
				: "Failed to load translations"
			: null,
		refetchTranslations: refetch,
	};
};
