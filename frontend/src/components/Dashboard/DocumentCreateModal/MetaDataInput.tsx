import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

function MetaDataInput({
	setMetadata,
	disable,
}: {
	setMetadata: (metadata: Json) => void;
	disable?: boolean;
}) {
	const [jsonFile, setJsonFile] = useState<File | null>(null);
	const [fileName, setFileName] = useState<string>("");
	const { t } = useTranslation();
	useEffect(() => {
		if (jsonFile) {
			const reader = new FileReader();
			reader.onload = (event) => {
				try {
					const jsonData = JSON.parse(event.target?.result as string);
					setMetadata(jsonData);
				} catch (error) {
					console.error("Error parsing JSON:", error);
				}
			};
			reader.readAsText(jsonFile);
		} else {
			setMetadata(null);
		}
	}, [jsonFile, setMetadata]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setJsonFile(file);
			setFileName(file.name);
		}
	};

	const handleReset = () => {
		setJsonFile(null);
		setFileName("");
		// Reset the file input value
		const fileInput = document.getElementById("json-file") as HTMLInputElement;
		if (fileInput) fileInput.value = "";
	};

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="json-file" className="text-sm font-medium">
				{t("projects.uploadMetadata")}(.json)
			</label>

			{!jsonFile ? (
				<Input
					id="json-file"
					type="file"
					accept=".json"
					onChange={handleFileChange}
					disabled={disable}
				/>
			) : (
				<div className="flex items-center justify-between p-2 border rounded-md">
					<span className="text-sm font-medium">{fileName}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReset}
						className="h-8 w-8 p-0"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}

export default MetaDataInput;
