export type FetchThreadProps = {
    documentId: string;
    startOffset: number | undefined;
    endOffset: number | undefined;
}

export type FetchSegmentsProps = {
    instanceId: string;
    startOffset: number;
    endOffset: number;
}

export type CreateThreadProps = {
    documentId: string;
    initialStartOffset: number;
    initialEndOffset: number;
    selectedText: string;
}

export type AddCommentProps = {
    docId: string,
    content: string,
    threadId: string | null,
    options: {
        isSuggestion?: boolean;
        suggestedText?: string | null;
        isSystemGenerated?: boolean;
        selectedText?: string;
        onDelta?: (delta: string) => void;
        onCompletion?: (finalText: string) => void;
        onSave?: (comment: any) => void;
        onError?: (message: string) => void;
    }
}