export type UploadMethod = "file" | "openpecha" | "empty";

export type AvailableMethodType = {
  type: UploadMethod;
  label: string;
  isDisabled?: boolean;
};

export type SelectedPechaType = {
  id: string;
  type: string;
  language: string;
  title: string;
};
