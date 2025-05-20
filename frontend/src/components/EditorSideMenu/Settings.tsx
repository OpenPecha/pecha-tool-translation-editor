import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiCredentials from './ApiCredentials';
import { Key, User, Monitor } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      
      <Tabs defaultValue="apiCredentials" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="apiCredentials" className="flex items-center gap-2">
            <Key size={16} />
            <span>API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User size={16} />
            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Monitor size={16} />
            <span>Display</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="apiCredentials" className="mt-2">
          <ApiCredentials />
        </TabsContent>
        
        <TabsContent value="account" className="mt-2">
          <div className="p-4 border rounded-md bg-gray-50 text-center">
            <p className="text-gray-500">Account settings coming soon</p>
          </div>
        </TabsContent>
        
        <TabsContent value="display" className="mt-2">
          <div className="p-4 border rounded-md bg-gray-50 text-center">
            <p className="text-gray-500">Display settings coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
