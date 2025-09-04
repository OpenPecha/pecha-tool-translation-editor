import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languages } from "@/utils/Constants";
import { Translation } from "../../DocumentWrapper";
import { BaseModal } from "@/components/shared/modals";

interface EditTranslationModalProps {
  translation: Translation;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (name?: string, language?: string) => void;
}

const EditTranslationModal: React.FC<EditTranslationModalProps> = ({
  translation,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(translation.name);
      setLanguage(translation.language);
      setIsSubmitting(false);
    }
  }, [isOpen, translation]);

  // Focus on name input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !language) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Only call onEdit if something actually changed
      const nameChanged = name !== translation.name;
      const languageChanged = language !== translation.language;
      
      if (nameChanged || languageChanged) {
        onEdit(
          nameChanged ? name : undefined,
          languageChanged ? language : undefined
        );
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating translation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setName(translation.name);
    setLanguage(translation.language);
    setIsSubmitting(false);
    onClose();
  };

  const isFormValid = name.trim() !== "" && language !== "";
  const hasChanges = name !== translation.name || language !== translation.language;

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={(open) => !open && handleCancel()}
      title="Edit Translation"
      variant="dialog"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-translation-name" className="text-sm font-medium text-gray-700 block mb-2">
              Translation Name
            </label>
            <Input
              id="edit-translation-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter translation name"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="edit-translation-language" className="text-sm font-medium text-gray-700 block mb-2">
              Language
            </label>
            <Select value={language} onValueChange={setLanguage} disabled={isSubmitting}>
              <SelectTrigger id="edit-translation-language" className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || !hasChanges || isSubmitting}
            className="min-w-[80px]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditTranslationModal;
