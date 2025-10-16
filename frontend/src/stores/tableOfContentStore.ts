import { create } from "zustand";

interface TableOfContentSyncState {
	synced: boolean;
	setSynced: (synced: boolean) => void;
}

interface TableOfContentOpenState {
	openStates: { [key: string]: boolean };
	setIsOpen: (documentId: string, isOpen: boolean) => void;
	isOpen: (documentId: string) => boolean;
	openAll: () => void;
	closeAll: () => void;
	documentIds: string[];
	addDocumentId: (documentId: string) => void;
	removeDocumentId: (documentId: string) => void;
}

export const useTableOfContentSyncStore = create<TableOfContentSyncState>(
	(set) => ({
		synced: false,
		setSynced: (synced) => set({ synced }),
	}),
);

export const useTableOfContentOpenStore = create<TableOfContentOpenState>(
	(set, get) => ({
		openStates: {},
		documentIds: [],
		setIsOpen: (documentId, isOpen) =>
			set((state) => ({
				openStates: {
					...state.openStates,
					[documentId]: isOpen,
				},
			})),
		isOpen: (documentId) => get().openStates[documentId] || false,
		openAll: () =>
			set((state) => {
				const newOpenStates = { ...state.openStates };
				state.documentIds.forEach((id) => {
					newOpenStates[id] = true;
				});
				return { openStates: newOpenStates };
			}),
		closeAll: () =>
			set((state) => {
				const newOpenStates = { ...state.openStates };
				state.documentIds.forEach((id) => {
					newOpenStates[id] = false;
				});
				return { openStates: newOpenStates };
			}),
		addDocumentId: (documentId) =>
			set((state) => ({
				documentIds: [...state.documentIds, documentId],
			})),
		removeDocumentId: (documentId) =>
			set((state) => ({
				documentIds: state.documentIds.filter((id) => id !== documentId),
			})),
	}),
);
