import { useQuillVersion } from "@/contexts/VersionContext";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import { FaSpinner } from "react-icons/fa";
import formatTimeAgo from "@/lib/formatTimeAgo";
import { useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { createPortal } from "react-dom";

interface Version {
	id: string;
	label: string;
	createdAt: string;
	user?: {
		username?: string;
		name?: string;
	} | null;
	isCurrent?: boolean;
}

interface EachVersionProps {
	version: Version;
	onDeleteClick: (versionId: string, versionLabel: string) => void;
	isDeleting: boolean;
}

function VersionList({ handleViewAll }: { handleViewAll: () => void }) {
	const { versions, deleteVersion } = useQuillVersion();
	const [deleteModalState, setDeleteModalState] = useState<{
		isOpen: boolean;
		versionId: string | null;
		versionLabel: string | null;
		isDeleting: boolean;
		error: string | null;
	}>({
		isOpen: false,
		versionId: null,
		versionLabel: null,
		isDeleting: false,
		error: null,
	});

	const handleDeleteClick = (versionId: string, versionLabel: string) => {
		console.log("Delete button clicked for version:", versionLabel);
		setDeleteModalState({
			isOpen: true,
			versionId,
			versionLabel,
			isDeleting: false,
			error: null,
		});
	};

	const handleDeleteConfirm = async () => {
		if (!deleteModalState.versionId) return;

		setDeleteModalState((prev) => ({ ...prev, isDeleting: true, error: null }));

		try {
			await deleteVersion(deleteModalState.versionId);
			setDeleteModalState({
				isOpen: false,
				versionId: null,
				versionLabel: null,
				isDeleting: false,
				error: null,
			});
		} catch (error) {
			console.error("Failed to delete version:", error);
			setDeleteModalState((prev) => ({
				...prev,
				isDeleting: false,
				error: "Failed to delete version. Please try again.",
			}));
		}
	};

	const handleCloseModal = () => {
		setDeleteModalState({
			isOpen: false,
			versionId: null,
			versionLabel: null,
			isDeleting: false,
			error: null,
		});
	};

	return (
		<>
			<div className="versions-list bg-neutral-50 dark:bg-neutral-800">
				<div className="flex  items-center">
					<span className="font-bold mb-2 text-xs flex-1">Versions</span>
					<span
						className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer hover:underline"
						onClick={handleViewAll}
					>
						View all
					</span>
				</div>
				{versions.length === 0 ? (
					<p className="text-neutral-700 dark:text-neutral-300">
						No saved versions yet
					</p>
				) : (
					<div className="max-h-60 overflow-y-auto border">
						{versions.map((version: Version) => (
							<EachVersion
								key={version.id}
								version={version}
								onDeleteClick={handleDeleteClick}
								isDeleting={
									deleteModalState.isDeleting &&
									deleteModalState.versionId === version.id
								}
							/>
						))}
					</div>
				)}
			</div>

			{createPortal(
				<ConfirmationModal
					open={deleteModalState.isOpen}
					onClose={handleCloseModal}
					onConfirm={
						deleteModalState.error ? handleCloseModal : handleDeleteConfirm
					}
					title={deleteModalState.error ? "Error" : "Delete Version"}
					message={
						deleteModalState.error
							? deleteModalState.error
							: `Are you sure you want to delete the version "${deleteModalState.versionLabel}"? This action cannot be undone.`
					}
					confirmText={deleteModalState.error ? "OK" : "Delete"}
					cancelText={deleteModalState.error ? undefined : "Cancel"}
					loading={deleteModalState.isDeleting}
				/>,
				document.getElementById("diff-portal")!,
			)}
		</>
	);
}

function EachVersion({ version, onDeleteClick, isDeleting }: EachVersionProps) {
	const { loadVersion, isLoadingVersion, loadingVersionId, versions } =
		useQuillVersion();

	const isLoading = isLoadingVersion && loadingVersionId === version.id;
	const isCurrentVersion = version.isCurrent || false;
	const isLatestVersion = versions[0]?.id === version.id;
	const isSystemVersion = version.user === null;
	const canDelete =
		isLatestVersion && !isLoading && !isDeleting && !isSystemVersion;

	const handleLoad = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isLoading) return;
		loadVersion(version.id);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (canDelete) {
			onDeleteClick(version.id, version.label);
		}
	};

	return (
		<div
			className={`px-2 py-2 border-b hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
				isCurrentVersion
					? "bg-secondary-100 dark:bg-neutral-700 dark:text-neutral-50"
					: ""
			}`}
		>
			<div className="flex justify-between items-center">
				<div
					className={`flex items-center gap-1 ${
						isCurrentVersion
							? "font-semibold text-secondary-600 dark:text-neutral-50"
							: ""
					}`}
				>
					{version.label}
				</div>
				<div className="flex gap-2 justify-end">
					{/* First button slot: Load (non-current) or invisible placeholder (current) */}

					{!isCurrentVersion || isSystemVersion ? (
						<button
							onClick={handleLoad}
							disabled={isLoading}
							className="px-2 py-1 rounded text-sm bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
						>
							{isLoading ? (
								<FaSpinner className="animate-spin" />
							) : (
								<SiTicktick />
							)}
						</button>
					) : (
						<div className="px-2 py-1 w-8"></div>
					)}

					{/* Second button slot: Delete (non-system) or invisible placeholder (system) */}
					{!isSystemVersion ? (
						<button
							onClick={handleDelete}
							disabled={!canDelete}
							className={`px-2 py-1 rounded text-sm ${
								canDelete
									? "bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700"
									: "invisible"
							}`}
						>
							{isDeleting ? (
								<FaSpinner className="animate-spin" />
							) : (
								<MdDelete />
							)}
						</button>
					) : (
						<div className="px-2 py-1 w-8 dark:bg-neutral-800"></div>
					)}
				</div>
			</div>

			<div
				className={`text-xs mt-1 ${
					isCurrentVersion
						? "text-secondary-600"
						: "text-neutral-700 dark:text-neutral-300"
				}`}
			>
				{version?.user?.username || version?.user?.name || "System"} •{" "}
				{formatTimeAgo(version.createdAt)}
			</div>
		</div>
	);
}

export default VersionList;
