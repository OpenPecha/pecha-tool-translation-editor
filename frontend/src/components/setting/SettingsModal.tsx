import React from "react";
import { Settings as SettingsIcon, Monitor, Key, User } from "lucide-react";
import { BiSync } from "react-icons/bi";
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
import { useEditor } from "@/contexts/EditorContext";
import useScrollHook from "@/hooks/useScrollHook";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
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
  const { selectedTranslationId } = useTranslationSidebarParams();
  
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

  // Determine if we're in dual editor mode
  const isDualMode = Boolean(selectedTranslationId && rootId && translationId);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon size={20} />
            {t("common.settings", "Settings")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <Tabs defaultValue={isDualMode ? "sync" : "display"} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="sync" className="flex items-center gap-2">
                  <BiSync size={16} />
                  <span>{t("common.syncOptions", "Sync")}</span>
                </TabsTrigger>
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Monitor size={16} />
                <span>{t("settings.display", "Display")}</span>
              </TabsTrigger>
              {isAuthenticated && <TabsTrigger value="apiCredentials" className="flex items-center gap-2">
                <Key size={16} />
                <span>{t("settings.apiKeys", "API Keys")}</span>
              </TabsTrigger>}
              {isAuthenticated && <TabsTrigger value="account" className="flex items-center gap-2">
                <User size={16} />
                <span>{t("settings.account", "Account")}</span>
              </TabsTrigger>}
            </TabsList>

            {/* Sync Options Tab - Only show in dual editor mode */}
            
              <TabsContent value="sync" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {t("common.syncOptions", "Sync Options")}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t("settings.syncDescription", "Configure how the dual editors synchronize with each other.")}
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
            

            {/* Display Settings Tab */}
            <TabsContent value="display" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("settings.display", "Display Settings")}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("settings.displayDescription", "Customize the appearance and behavior of the editor.")}
                  </p>
                </div>
                <div className="p-4 border rounded-md bg-gray-50 text-center">
                  <p className="text-gray-500">
                    {t("settings.displayComingSoon", "Display settings coming soon")}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* API Credentials Tab */}
            {isAuthenticated && <TabsContent value="apiCredentials" className="mt-4">
                <ApiCredentials />
            </TabsContent>}

            {/* Account Settings Tab */}
            {isAuthenticated && <TabsContent value="account" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t("settings.account", "Account Settings")}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("settings.accountDescription", "Manage your account preferences and profile.")}
                  </p>
                </div>
                <div className="p-4 border rounded-md bg-gray-50 text-center">
                  <p className="text-gray-500">
                    {t("settings.accountComingSoon", "Account settings coming soon")}
                  </p>
                </div>
              </div>
            </TabsContent>}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
