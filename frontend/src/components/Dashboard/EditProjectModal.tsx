import { useState } from "react";
import { Project } from "@/api/project";
import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { useTranslate } from "@tolgee/react";

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: (name: string, identifier: string) => Promise<void>;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  onClose,
  onUpdate,
}) => {
  const [name, setName] = useState(project.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const { t } = useTranslate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdate(name, project.identifier);
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
    } finally {
      setIsUpdating(false);
    }
  };
  const disable = isUpdating || name === project.name || name === "";
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div
        className="fixed inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg relative z-10">
        <h2 className="text-lg font-semibold p-4 ">{t("projects.rename")}</h2>
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <label
              htmlFor="name"
              className="block mb-1 font-medium text-gray-500"
            >
              {t("projects.enterProjectName")}
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className=" p-4   flex justify-end gap-4">
            <Button
              type="button"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={disable}
            >
              {isUpdating ? t("common.updating") : t("common.update")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
