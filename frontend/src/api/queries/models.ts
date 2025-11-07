import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import getModels, { type Model } from "@/api/model";
import type { ModelName } from "@/api/translate";

// Query key factory for models
export const modelsKeys = {
  all: ["models"] as const,
  lists: () => [...modelsKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...modelsKeys.lists(), filters] as const,
};

// Models query options
export const modelsQueryOptions = {
  queryKey: modelsKeys.lists(),
  queryFn: getModels,
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 30, // 30 minutes
  retry: 3,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};

export interface UseModelsReturn {
  /** Array of available models from the API */
  models: Model[];
  /** Array of model values (IDs) for backward compatibility */
  modelNames: ModelName[];
  /** Whether the models are currently being fetched */
  isLoading: boolean;
  /** Error message if the fetch failed, null otherwise */
  error: string | null;
  /** Function to manually refetch the models */
  refetch: () => void;
  /** Function to invalidate the models cache and trigger a refetch */
  invalidateModels: () => Promise<void>;
}

/**
 * React Query hook for fetching and managing AI models
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Automatic retries with exponential backoff
 * - Background refetching when data becomes stale
 * - Optimistic updates and cache invalidation
 *
 * @returns UseModelsReturn object with models data and control functions
 */
export const useModels = (): UseModelsReturn => {
  const queryClient = useQueryClient();

  const {
    data: models = [],
    isLoading,
    error,
    refetch,
  } = useQuery(modelsQueryOptions);

  // Extract model names (values) for use with existing ModelName type
  const modelNames: ModelName[] = models.map(
    (model) => model.value as ModelName
  );

  const invalidateModels = async () => {
    await queryClient.invalidateQueries({ queryKey: modelsKeys.all });
  };

  return {
    models,
    modelNames,
    isLoading,
    error: error?.message || null,
    refetch,
    invalidateModels,
  };
};

/**
 * Prefetch models data to populate the cache before it's needed
 * Useful for improving perceived performance
 *
 * @param queryClient - The React Query client instance
 * @returns Promise that resolves when prefetch is complete
 */
export const prefetchModels = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  return queryClient.prefetchQuery(modelsQueryOptions);
};

/**
 * Mutation hook for manually refreshing models data
 * Useful for implementing manual refresh buttons or error recovery
 *
 * @returns Mutation object with mutate function and status
 */
export const useRefreshModels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: getModels,
    onSuccess: (data) => {
      // Update the cache with fresh data
      queryClient.setQueryData(modelsKeys.lists(), data);
    },
    onError: (error) => {
      console.error("Failed to refresh models:", error);
      // Invalidate to trigger a refetch
      queryClient.invalidateQueries({ queryKey: modelsKeys.all });
    },
  });
};

/**
 * Get cached models data without triggering a network request
 * Returns empty array if no data is cached
 *
 * @param queryClient - The React Query client instance
 * @returns Array of cached models or empty array
 */
export const getCachedModels = (
  queryClient: ReturnType<typeof useQueryClient>
): Model[] => {
  return queryClient.getQueryData(modelsKeys.lists()) || [];
};

/**
 * Check if models data is cached and still fresh (not stale)
 * Useful for conditional logic based on cache state
 *
 * @param queryClient - The React Query client instance
 * @returns true if models are cached and fresh, false otherwise
 */
export const areModelsCached = (
  queryClient: ReturnType<typeof useQueryClient>
): boolean => {
  const queryState = queryClient.getQueryState(modelsKeys.lists());
  return queryState?.status === "success" && !queryState?.isStale;
};
