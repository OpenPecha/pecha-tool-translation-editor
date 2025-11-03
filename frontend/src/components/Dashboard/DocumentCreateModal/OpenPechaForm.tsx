import { OpenPechaTextLoader } from "./OpenPechaTextLoader";

interface OpenPechaFormProps {
  readonly projectName: string;
  readonly closeOnSuccess: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
}

export function OpenPechaForm({
  projectName,
  closeOnSuccess,
  onValidationChange,
  onCreateProject,
}: OpenPechaFormProps) {
  return (
    <OpenPechaTextLoader
      projectName={projectName}
      closeModal={closeOnSuccess}
      onValidationChange={onValidationChange}
      onCreateProject={onCreateProject}
    />
  );
}

