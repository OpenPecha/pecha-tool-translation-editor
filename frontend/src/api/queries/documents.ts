import { useQuery } from "@tanstack/react-query";
import {
  fetchDocument,
  fetchPublicDocument,
  fetchPublicDocumentTranslations,
} from "../document";
import {
  fetchComments,
  fetchCommentsByThreadId,
  fetchPublicComments,
} from "../comment";
import { fetchFootnotesByThreadId, fetchPublicFootnotes } from "../footnote";
import { fetchPublicProjects } from "../project";

const useFetchDocument = (documentId: string) => {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocument(documentId),
    enabled: !!documentId,
  });
};

const useFetchPublicDocuments = ({
  currentPage,
  limit,
  searchQuery,
}: {
  currentPage: number;
  limit: number;
  searchQuery: string;
}) => {
  return useQuery({
    queryKey: ["publicProjects", currentPage, limit, searchQuery],
    queryFn: () =>
      fetchPublicProjects({
        page: currentPage,
        limit,
        search: searchQuery,
      }),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

const useFetchPublicDocument = (documentId: string) => {
  return useQuery({
    queryKey: ["publicDocument", documentId],
    queryFn: () => fetchPublicDocument(documentId!),
    enabled: !!documentId,
    retry: 1,
  });
};

const useFetchPublicDocumentTranslations = (documentId: string) => {
  return useQuery({
    queryKey: ["publicDocumentTranslations", documentId],
    queryFn: () => fetchPublicDocumentTranslations(documentId!),
    enabled: !!documentId,
    retry: 1,
  });
};

const useFetchDocumentComments = (documentId: string) => {
  return useQuery({
    queryKey: ["public-comments", documentId],
    queryFn: () => fetchPublicComments(documentId),
    enabled: !!documentId,
    staleTime: 30000,
  });
};

const useFetchDocumentFootnotes = (documentId: string) => {
  return useQuery({
    queryKey: ["public-footnotes", documentId],
    queryFn: () => fetchPublicFootnotes(documentId),
    enabled: !!documentId,
    staleTime: 30000,
  });
};

const useFetchFootnotesByThreadId = (threadId: string) => {
  return useQuery({
    queryKey: ["footnote", threadId],
    queryFn: () => fetchFootnotesByThreadId(threadId!),
    enabled: !!threadId,
  });
};

const useFetchComments = (id: string) => {
  return useQuery<Comment[]>({
    queryKey: ["comments", id],
    queryFn: () => fetchComments(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
};
const useFetchCommentsByThreadId = (threadId: string) => {
  return useQuery<Comment[]>({
    queryKey: ["comments", threadId],
    queryFn: async () => {
      // Only fetch if we have a valid threadId
      if (!threadId) return [];
      try {
        return await fetchCommentsByThreadId(threadId);
      } catch (error) {
        console.error("Error fetching thread comments:", error);
        return [];
      }
    },
    enabled: !!threadId,
    staleTime: 30000,
  });
};

export {
  useFetchComments,
  useFetchCommentsByThreadId,
  useFetchFootnotesByThreadId,
  useFetchDocument,
  useFetchPublicDocument,
  useFetchPublicDocumentTranslations,
  useFetchDocumentComments,
  useFetchDocumentFootnotes,
  useFetchPublicDocuments,
};
