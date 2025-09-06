import React from "react";
import { User, Mail, Calendar, Shield } from "lucide-react";
import { useTranslate } from "@tolgee/react";
import { useAuth } from "@/auth/use-auth-hook";
import AvatarWrapper from "@/components/ui/custom-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const UserProfile: React.FC = () => {
  const { t } = useTranslate();
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="p-4 border rounded-md bg-gray-50 text-center">
        <p className="text-gray-500">
          {t("profile.notAuthenticated", "Please log in to view your profile.")}
        </p>
      </div>
    );
  }

  // Extract user information
  const { name, email, picture } = currentUser;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={20} />
            {t("profile.title", "User Profile")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <AvatarWrapper
                imageUrl={picture}
                name={name}
                size={80}
                className="border-4 border-gray-100 shadow-lg"
              />
            </div>
            
            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {name || t("profile.nameUnavailable", "Name not available")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("profile.member", "Pecha Tool Member")}
                </p>
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield size={12} />
                  {t("profile.verified", "Verified Account")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("profile.accountDetails", "Account Details")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Mail size={16} className="text-gray-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("profile.email", "Email Address")}
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {email}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("profile.statistics", "Account Statistics")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                --
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("profile.projectsWorked", "Projects Worked")}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                --
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("profile.documentsEdited", "Documents Edited")}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                --
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("profile.translationsCompleted", "Translations Completed")}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>{t("profile.note", "Note")}:</strong>{" "}
              {t("profile.statisticsNote", "Detailed statistics will be available in a future update.")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
