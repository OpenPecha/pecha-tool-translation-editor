import React, { useReducer, useRef, useMemo, useCallback } from "react";
import { deleteDocument } from "@/api/document";
import { UploadMethod } from "@/components/Dashboard/DocumentCreateModal/types";

const TOTAL_STEPS = 3;

interface State {
  projectName: string;
  open: boolean;
  currentStep: number;
  selectedMethod: UploadMethod | null;
  isFormValid: boolean;
  isCreating: boolean;
  newDocumentId: string | null;
}

type Action =
  | { type: "SET_PROJECT_NAME"; payload: string }
  | { type: "SET_OPEN"; payload: boolean }
  | { type: "NEXT_STEP" }
  | { type: "PREVIOUS_STEP" }
  | { type: "SELECT_METHOD"; payload: UploadMethod | null }
  | { type: "SET_FORM_VALID"; payload: boolean }
  | { type: "SET_IS_CREATING"; payload: boolean }
  | { type: "SET_NEW_DOCUMENT_ID"; payload: string | null }
  | { type: "RESET" };

const initialState: State = {
  projectName: "",
  open: false,
  currentStep: 1,
  selectedMethod: null,
  isFormValid: false,
  isCreating: false,
  newDocumentId: null
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PROJECT_NAME":
      return { ...state, projectName: action.payload };
    case "SET_OPEN":
      return { ...state, open: action.payload };
    case "NEXT_STEP":
      return {
        ...state,
        currentStep:
          state.currentStep < TOTAL_STEPS
            ? state.currentStep + 1
            : state.currentStep
      };
    case "PREVIOUS_STEP":
      return {
        ...state,
        currentStep:
          state.currentStep > 1 ? state.currentStep - 1 : state.currentStep
      };
    case "SELECT_METHOD":
      return { ...state, selectedMethod: action.payload };
    case "SET_FORM_VALID":
      return { ...state, isFormValid: action.payload };
    case "SET_IS_CREATING":
      return { ...state, isCreating: action.payload };
    case "SET_NEW_DOCUMENT_ID":
      return { ...state, newDocumentId: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useDocumentCreateModal() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const createProjectRef = useRef<(() => void) | null>(null);

  const setProjectName = useCallback((name: string) => {
    dispatch({ type: "SET_PROJECT_NAME", payload: name });
  }, []);

  const setSelectedMethod = useCallback((method: UploadMethod | null) => {
    dispatch({ type: "SELECT_METHOD", payload: method });
  }, []);

  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const handlePrevious = useCallback(async () => {
    if (state.currentStep === TOTAL_STEPS && state.newDocumentId) {
      try {
        await deleteDocument(state.newDocumentId);
      } catch (error) {
        console.error("Failed to delete document on previous step:", error);
      }
      dispatch({ type: "SET_NEW_DOCUMENT_ID", payload: null });
      dispatch({ type: "SET_FORM_VALID", payload: false });
    }
    dispatch({ type: "PREVIOUS_STEP" });
  }, [state.currentStep, state.newDocumentId]);

  const setFormValid = useCallback((isValid: boolean) => {
    dispatch({ type: "SET_FORM_VALID", payload: isValid });
  }, []);

  const setNewDocumentId = useCallback((id: string | null) => {
    dispatch({ type: "SET_NEW_DOCUMENT_ID", payload: id });
  }, []);

  const resetModalState = useCallback(() => {
    dispatch({ type: "RESET" });
    createProjectRef.current = null;
  }, []);

  const closeAndCleanup = useCallback(async () => {
    if (state.newDocumentId) {
      try {
        await deleteDocument(state.newDocumentId);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
    dispatch({ type: "SET_OPEN", payload: false });
    resetModalState();
  }, [state.newDocumentId, resetModalState]);

  const closeOnSuccess = useCallback(() => {
    dispatch({ type: "SET_OPEN", payload: false });
    resetModalState();
  }, [resetModalState]);

  const handleModalOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        dispatch({ type: "SET_OPEN", payload: true });
      } else {
        closeAndCleanup();
      }
    },
    [closeAndCleanup]
  );

  const handleCreateButtonClick = useCallback(() => {
    dispatch({ type: "SET_OPEN", payload: true });
  }, []);

  const handleCreateProject = useCallback(() => {
    if (createProjectRef.current) {
      dispatch({ type: "SET_IS_CREATING", payload: true });
      createProjectRef.current();
    }
  }, []);

  const canGoNext = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return state.projectName.trim().length > 0;
      case 2:
        return state.selectedMethod !== null;
      default:
        return false;
    }
  }, [state.currentStep, state.projectName, state.selectedMethod]);

  return {
    state,
    totalSteps: TOTAL_STEPS,
    createProjectRef,
    setProjectName,
    setSelectedMethod,
    handleNext,
    handlePrevious,
    setFormValid,
    setNewDocumentId,
    closeOnSuccess,
    handleModalOpenChange,
    handleCreateButtonClick,
    handleCreateProject,
    canGoNext
  };
}
