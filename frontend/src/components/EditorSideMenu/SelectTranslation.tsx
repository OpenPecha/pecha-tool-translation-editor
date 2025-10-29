import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateTranslationModal from "./CreateTranslationModal";
import { useParams } from "react-router-dom";
import { useCurrentDocTranslations } from "@/hooks/useCurrentDoc";

// Import components
import TranslationList from "./components/TranslationList";
import { useTranslation } from "react-i18next";

function SelectTranslation() {
	const [showCreateModal, setShowCreateModal] = useState(false);
	const { t } = useTranslation();
	const { id } = useParams();
	const rootId = id as string;
	// URL params hook is used in child components
	const { translations, refetchTranslations } =
		useCurrentDocTranslations(rootId);

	return (
		<div className="rounded-lg overflow-hidden">
			<div className="flex justify-between items-center mb-4">
				<h3 className="font-medium font-google-sans text-neutral-800 dark:text-neutral-100">
					{t("translation.translations")}
				</h3>
				<Button
					onClick={() => setShowCreateModal(true)}
					size="sm"
					className="flex items-center gap-1 h-8 cursor-pointer"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			<div className="flex flex-col gap-2 p-2">
				<TranslationList translations={translations} />
			</div>
			{showCreateModal && (
				<CreateTranslationModal
					rootId={rootId}
					onClose={() => setShowCreateModal(false)}
					refetchTranslations={refetchTranslations}
				/>
			)}
		</div>
	);
}

export default SelectTranslation;
