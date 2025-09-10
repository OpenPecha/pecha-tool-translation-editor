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
        <p className="">
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
      <Card className="bg-neutral-100 dark:bg-neutral-700">
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
                className="border-4 border-neutral-100 dark:border-neutral-700 shadow-lg"
              />
            </div>
            
            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {name || t("profile.nameUnavailable", "Name not available")}
                </h3>
                <p className="text-sm">
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
      <Card className="bg-neutral-100 dark:bg-neutral-700">
        <CardHeader>
          <CardTitle className="text-lg">
            {t("profile.accountDetails", "Account Details")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
              <Mail size={16} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t("profile.email", "Email Address")}
                </p>
                  <p className="text-sm">
                  {email}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
