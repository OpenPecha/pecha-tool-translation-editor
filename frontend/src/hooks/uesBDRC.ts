import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

export interface BdrcSearchResult {
  workId?: string;
  instanceId?: string;
  title?: string;
  catalogInfo?: string | null;
  creator?: string | null;
  language?: string | null;
  workGenre?: string | null;
  workHasInstance?: string[];
  entityScore?: number | null;
  // Person-specific fields
  bdrc_id?: string;
  name?: string;
}

/**
 * Custom hook for searching BDRC entries using React Query
 *
 * @param searchQuery - The search query string
 * @param type - The type to search for (Instance, Text, Person, etc.)
 * @param debounceMs - Debounce delay in milliseconds (default: 1000ms)
 * @returns search results and loading state
 */
const VITE_CATALOGER_URL =
  import.meta.env.VITE_CATALOGER_URL || "http://localhost:8000";

export function useBdrcSearch(
  searchQuery: string,
  type: "Instance" | "Person" = "Instance",
  debounceMs: number = 1000
) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const trimmedQuery = debouncedQuery.trim();
  const isEnabled = trimmedQuery.length > 0;

  const { data, isLoading, error } = useQuery<BdrcSearchResult[]>({
    queryKey: ["bdrcSearch", trimmedQuery, type],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${VITE_CATALOGER_URL}/bdrc/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_query: trimmedQuery,
          from: 0,
          size: 20,
          filter: [],
          type: type,
        }),
        signal, // Pass abort signal to cancel previous requests
      });

      if (!response.ok) {
        throw new Error("Failed to search BDRC entries");
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    results: data ?? [],
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Unknown error"
      : null,
  };
}
