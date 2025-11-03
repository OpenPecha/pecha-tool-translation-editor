import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface ProjectNameStepProps {
  projectName: string;
  setProjectName: (name: string) => void;
  onNext: () => void;
}

export function ProjectNameStep({
  projectName,
  setProjectName,
  onNext,
}: ProjectNameStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-400 mb-2">
          {t(`projects.projectDetails`)}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-500">
          {t(`projects.enterProjectName`)}
        </p>
      </div>
      <div className="space-y-4">
        <Label
          htmlFor="projectName"
          className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          {t(`projects.projectName`)}
        </Label>
        <Input
          id="projectName"
          value={projectName}
          className="w-full border-gray-300 focus:border-secondary-500 focus:ring-secondary-500"
          onChange={(e) => setProjectName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && projectName.trim().length > 0) {
              onNext();
            }
          }}
          placeholder={t(`projects.enterProjectName`)}
          autoFocus
        />
      </div>
    </div>
  );
}
