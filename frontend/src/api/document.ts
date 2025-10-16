import { Op } from "quill";
import { getHeaders, getHeadersMultipart } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

export const fetchPublicDocuments = async () => {
	try {
		const response = await fetch(`${server_url}/documents/public`, {
			headers: getHeaders(),
		});

		if (response.ok) {
			const data = await response.json();
			return data;
		}
	} catch (error) {
		console.log(error);
	}
};

export const fetchDocuments = async ({
	search,
	isRoot,
}: {
	search?: string;
	isRoot?: boolean;
} = {}) => {
	try {
		let url = `${server_url}/documents`;
		const params = new URLSearchParams();

		if (search) params.append("search", search);
		if (isRoot !== undefined) params.append("isRoot", isRoot.toString());

		if (params.toString()) {
			url += `?${params.toString()}`;
		}

		const response = await fetch(url, {
			headers: getHeaders(),
		});

		if (response.ok) {
			const data = await response.json();
			return data;
		}
	} catch (error) {
		console.log(error);
	}
};

export const fetchDocument = async (id: string) => {
	try {
		const response = await fetch(`${server_url}/documents/${id}`, {
			headers: getHeaders(),
		});
		if (response.ok) {
			const data = await response.json();
			return data;
		}
		throw new Error("Failed to fetch document");
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export const fetchPublicDocument = async (id: string) => {
	try {
		const response = await fetch(`${server_url}/documents/public/${id}`, {
			headers: getHeaders(),
		});
		if (response.ok) {
			const data = await response.json();
			return data;
		}
		throw new Error("Failed to fetch public document");
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export const fetchDocumentWithContent = async (id: string) => {
	try {
		const response = await fetch(`${server_url}/documents/${id}/content`, {
			headers: getHeaders(),
		});
		if (response.ok) {
			const data = await response.json();
			return data;
		}
		throw new Error("Failed to fetch document");
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export const createDocument = async (formData: FormData) => {
	const response = await fetch(`${server_url}/documents`, {
		method: "POST",
		headers: {
			...getHeadersMultipart(),
			// Don't set Content-Type header, it will be automatically set with the boundary
		},
		body: formData,
	});
	if (!response.ok) {
		const error = await response.text();
		throw new Error(error ?? "Failed to create document");
	}

	return response.json();
};

export const createDocumentWithContent = async (formData: FormData) => {
	const body = JSON.stringify(Object.fromEntries(formData));
	const response = await fetch(`${server_url}/documents/content`, {
		method: "POST",
		headers: getHeaders(),
		body,
	});
	if (!response.ok) {
		const error = await response.text();
		throw new Error(error ?? "Failed to create document");
	}

	return response.json();
};

export const updatePermission = async (
	id: string,
	email: string,
	canRead: string,
	canWrite: string,
) => {
	try {
		const response = await fetch(`${server_url}/documents/${id}/permissions`, {
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify({
				email,
				canRead,
				canWrite,
			}),
		});
		const data = await response.json();
		return data;
	} catch (error) {
		if (error instanceof Error) {
			return { error: error.message };
		}
		return { error: "Failed to update permission" };
	}
};
export const deleteDocument = async (id: string) => {
	try {
		const response = await fetch(`${server_url}/documents/${id}`, {
			headers: getHeaders(),
			method: "DELETE",
		});

		if (response.ok) {
			const data = await response.json();
			return data;
		}
	} catch (error) {
		console.log(error);
	}
};

interface UpdateDocumentParams {
	name?: string;
	content?: Op[];
	language?: string;
}

/**
 * Fetch all translations for a document
 * @param documentId The ID of the document to fetch translations for
 * @returns A promise that resolves to an array of translations
 */
export const fetchDocumentTranslations = async (documentId: string) => {
	try {
		const response = await fetch(
			`${server_url}/documents/${documentId}/translations`,
			{
				method: "GET",
				headers: getHeaders(),
			},
		);
		console.log("response", response);
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message ?? "Failed to fetch translations");
		}

		const data = await response.json();
		return data.data;
	} catch (error) {
		console.error("Error fetching translations:", error);
		throw error;
	}
};

/**
 * Fetch all translations for a public document
 * @param documentId The ID of the document to fetch translations for
 * @returns A promise that resolves to an array of translations
 */
export const fetchPublicDocumentTranslations = async (documentId: string) => {
	try {
		const response = await fetch(
			`${server_url}/documents/${documentId}/translations`,
			{
				method: "GET",
				headers: getHeaders(),
			},
		);

		if (!response.ok) {
			// If unauthorized, return empty array instead of throwing error
			if (response.status === 401 || response.status === 403) {
				return [];
			}
			throw new Error("Failed to fetch translations");
		}

		const data = await response.json();
		return data.data || [];
	} catch (error) {
		console.error("Error fetching public translations:", error);
		return []; // Return empty array for public access
	}
};

export const updateDocument = async (
	id: string,
	data: UpdateDocumentParams,
) => {
	try {
		const response = await fetch(`${server_url}/documents/${id}`, {
			method: "PATCH",
			headers: getHeaders(),
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error ?? "Failed to update document");
		}

		const updatedData = await response.json();
		return updatedData.data;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		}
		throw new Error("Failed to update document");
	}
};

export interface GenerateTranslationParams {
	rootId: string;
	language: string;
	model: string;
	use_segmentation: string | null;
}

export const generateTranslation = async (
	params: GenerateTranslationParams,
) => {
	try {
		const response = await fetch(
			`${server_url}/documents/generate-translation`,
			{
				method: "POST",
				headers: getHeaders(),
				body: JSON.stringify(params),
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error ?? "Failed to generate translation");
		}

		return await response.json();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		}
		throw new Error("Failed to generate translation");
	}
};

export const updateContentDocument = async (
	id: string,
	data: UpdateDocumentParams,
) => {
	try {
		const response = await fetch(`${server_url}/documents/${id}/content`, {
			method: "PATCH",
			headers: getHeaders(),
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error ?? "Failed to update document");
		}
		const updatedData = await response.json();
		return updatedData.data;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		}
		throw new Error("Failed to update document");
	}
};
