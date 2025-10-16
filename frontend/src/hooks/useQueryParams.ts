import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Custom hook for managing URL query parameters
 * Provides type-safe methods to get and set query parameters
 */
export function useQueryParams() {
	const [searchParams, setSearchParams] = useSearchParams();

	// Get a query parameter value
	const getParam = useCallback(
		(key: string): string | null => {
			return searchParams.get(key);
		},
		[searchParams],
	);

	// Set a query parameter
	const setParam = useCallback(
		(key: string, value: string | null) => {
			const newParams = new URLSearchParams(searchParams);

			if (value === null || value === undefined || value === "") {
				newParams.delete(key);
			} else {
				newParams.set(key, value);
			}

			setSearchParams(newParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	// Set multiple parameters at once
	const setParams = useCallback(
		(params: Record<string, string | null>) => {
			const newParams = new URLSearchParams(searchParams);

			Object.entries(params).forEach(([key, value]) => {
				if (value === null || value === undefined || value === "") {
					newParams.delete(key);
				} else {
					newParams.set(key, value);
				}
			});

			setSearchParams(newParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	// Remove a query parameter
	const removeParam = useCallback(
		(key: string) => {
			const newParams = new URLSearchParams(searchParams);
			newParams.delete(key);
			setSearchParams(newParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	// Get all current parameters as an object
	const getAllParams = useCallback((): Record<string, string> => {
		const params: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			params[key] = value;
		});
		return params;
	}, [searchParams]);

	return {
		getParam,
		setParam,
		setParams,
		removeParam,
		getAllParams,
		searchParams,
	};
}

/**
 * Hook specifically for managing translation sidebar state via URL params
 */
export function useTranslationSidebarParams() {
	const { getParam, setParam, removeParam } = useQueryParams();

	// Get selected translation ID from URL
	const selectedTranslationId = getParam("translation");

	// Set selected translation ID in URL
	const setSelectedTranslationId = useCallback(
		(id: string | null) => {
			setParam("translation", id);
		},
		[setParam],
	);

	// Clear selected translation ID from URL
	const clearSelectedTranslationId = useCallback(() => {
		removeParam("translation");
	}, [removeParam]);

	return {
		selectedTranslationId,
		setSelectedTranslationId,
		clearSelectedTranslationId,
	};
}
