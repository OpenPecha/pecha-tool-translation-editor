import { searchTextByTitle } from "@/api/openpecha";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export const useTitleSearch = (searchQuery: string, debounceMs: number = 1000) => {
    console.log("searchQuery in useTitleSearch ::", searchQuery);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, debounceMs);
        return () => clearTimeout(timer);
    }, [searchQuery, debounceMs]);

    const trimmedSearchQuery = debouncedSearchQuery.trim();
    const isEnabled = trimmedSearchQuery.length > 0;

    const { data, isLoading, error } = useQuery({
        queryKey: ["titleSearch", trimmedSearchQuery],
        queryFn: () => searchTextByTitle(trimmedSearchQuery),
        enabled: isEnabled,
        gcTime: 10 * 60 * 1000,
    });
    return {
        data,
        isLoading,
        error,
    };
}