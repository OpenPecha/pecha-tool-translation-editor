import React from "react";
import { Settings as SettingsIcon, Monitor, Key, User } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@tolgee/react";
import SyncOptions from "./SyncOptions";
import ApiCredentials from "./ApiCredentials";
import UserProfile from "./UserProfile";
import DisplaySettings from "./DisplaySettings";
import { useEditor } from "@/contexts/EditorContext";
import useScrollHook from "@/hooks/useScrollHook";
import { useAuth } from "@/auth/use-auth-hook";

interface SettingsModalProps {
	children?: React.ReactNode;
	rootId?: string;
	translationId?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
	children,
	rootId,
	translationId,
}) => {
	const { t } = useTranslate();
	const { isAuthenticated } = useAuth();
	const { getQuill } = useEditor();
	// Get Quill instances for sync functionality (only in dual editor mode)
	const quill1 = rootId ? getQuill(rootId) : null;
	const quill2 = translationId ? getQuill(translationId) : null;

	// Use scroll hook only if we have both editors
	const scrollHookResult = useScrollHook(quill1, quill2);
	const { syncMode, setSyncMode, syncType, setSyncType } = scrollHookResult || {
		syncMode: "none" as const,
		setSyncMode: () => {},
		syncType: "lineNumber" as const,
		setSyncType: () => {},
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				{children || (
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-2"
					>
						<SettingsIcon size={16} />
						{t("common.settings", "Settings")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<SettingsIcon size={20} />
						{t("common.settings", "Settings")}
					</DialogTitle>
				</DialogHeader>

				<div className="mt-4">
					<Tabs defaultValue="sync" className="w-full">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="sync" className="flex items-center gap-2">
								<Monitor size={16} />
								<span>{t("settings.sync", "Sync")}</span>
							</TabsTrigger>
							<TabsTrigger value="display" className="flex items-center gap-2">
								<Monitor size={16} />
								<span>{t("settings.display", "Display")}</span>
							</TabsTrigger>
							{isAuthenticated && (
								<TabsTrigger
									value="apiCredentials"
									className="flex items-center gap-2"
								>
									<Key size={16} />
									<span>{t("settings.apiKeys", "API Keys")}</span>
								</TabsTrigger>
							)}
							{isAuthenticated && (
								<TabsTrigger
									value="account"
									className="flex items-center gap-2"
								>
									<User size={16} />
									<span>{t("settings.account", "Account")}</span>
								</TabsTrigger>
							)}
						</TabsList>

						<TabsContent value="sync" className="mt-4">
							<div className="gap-2 space-y-4 justify-between items-center">
								<div>
									<p className="text-sm ">
										{t(
											"settings.syncDescription",
											"synchronization behavior of the editor.",
										)}
									</p>
								</div>
								<SyncOptions
									syncMode={syncMode}
									setSyncMode={setSyncMode}
									syncType={syncType}
									setSyncType={setSyncType}
								/>
							</div>
						</TabsContent>
						<TabsContent value="display" className="mt-4">
							<div className="space-y-4">
								<div>
									<h3 className="text-lg font-semibold mb-2">
										{t("settings.display", "Display Settings")}
									</h3>
								</div>
								<DisplaySettings />
							</div>
						</TabsContent>

						{/* API Credentials Tab */}
						{isAuthenticated && (
							<TabsContent value="apiCredentials" className="mt-4">
								<ApiCredentials />
							</TabsContent>
						)}

						{/* Account Settings Tab */}
						{isAuthenticated && (
							<TabsContent value="account" className="mt-4">
								<UserProfile />
							</TabsContent>
						)}
					</Tabs>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default SettingsModal;
