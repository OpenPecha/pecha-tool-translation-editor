import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  Languages,
  MessageSquare,
  Download,
  Users,
  Play,
  CheckCircle,
  Menu,
  X,
  GitBranch,
  Loader2,
} from "lucide-react";

// Loading Iframe Component
const LoadingIframe = ({ src, title }: { src: string; title: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="w-full h-[calc(100vh-200px)] overflow-hidden rounded-lg border relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-secondary-500" />
            <p className="text-gray-600">Loading documentation for ..</p>
          </div>
        </div>
      )}
      <iframe
        src={src}
        className="w-full h-full"
        sandbox="allow-scripts allow-top-navigation-by-user-activation allow-popups allow-same-origin"
        security="restricted"
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        frameBorder="0"
        allowFullScreen
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

function Documentation() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("getting-started");

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Pecha Translation Editor Documentation
            </h1>
          </div>
        </div>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Learn how to use the Pecha Translation Editor to create, edit, and
          collaborate on Tibetan text projects.
        </p>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div
          className={`bg-white border-r transition-all duration-300 ease-in-out ${
            sidebarOpen ? "w-64" : "w-0"
          } overflow-hidden`}
        >
          <div className="p-4">
            <div className="space-y-2">
              <button
                onClick={() => handleTabChange("getting-started")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "getting-started"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <Play size={16} />
                <span>Getting Started</span>
              </button>
              <button
                onClick={() => handleTabChange("projects")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "projects"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <BookOpen size={16} />
                <span>Projects</span>
              </button>
              <button
                onClick={() => handleTabChange("translations")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "translations"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <Languages size={16} />
                <span>Translations</span>
              </button>
              <button
                onClick={() => handleTabChange("versions")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "versions"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <GitBranch size={16} />
                <span>Versions</span>
              </button>
              <button
                onClick={() => handleTabChange("comments")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "comments"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <MessageSquare size={16} />
                <span>Comments</span>
              </button>
              <button
                onClick={() => handleTabChange("collaboration")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "collaboration"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <Users size={16} />
                <span>Collaboration</span>
              </button>
              <button
                onClick={() => handleTabChange("export")}
                className={`flex items-center gap-3 w-full justify-start p-3 rounded-lg transition-colors ${
                  activeTab === "export"
                    ? "bg-secondary-50 text-secondary-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <Download size={16} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Getting Started Tab */}
          {activeTab === "getting-started" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play size={20} />
                    Welcome to Pecha Translation Editor
                  </CardTitle>
                  <CardDescription>
                    Get started with your first pecha text translation Editor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        What is Pecha Translation Editor?
                      </h3>
                      <p className="text-gray-600">
                        Pecha Translation Editor is an advanced annotation and
                        collaborative editing platform built for working with
                        Tibetan texts in the PechaData format. It allows
                        multiple users to upload, edit, translate, and
                        collaborate on Tibetan text documents.
                      </p>

                      <h3 className="text-lg font-semibold">Key Features</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          Two-panel text sync for parallel text editing
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          Footnote with text and translation
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          Inline comments and suggestions
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          Version control and change tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          AI supported
                        </li>
                      </ul>

                      <h3 className="text-lg font-semibold mt-6">
                        Authentication
                      </h3>
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <h4 className="font-medium text-gray-900">
                            Google Sign-In
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Sign in securely using your Google account. This
                            provides quick access and secure authentication.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Quick Start Guide
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg">
                          <div className="bg-secondary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            1
                          </div>
                          <div>
                            <p className="font-medium">
                              Sign in to your account
                            </p>
                            <p className="text-sm text-gray-600">
                              Go to "/login" or click the "Login" button in the
                              top right corner and sign in using your Google
                              account
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg">
                          <div className="bg-secondary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            2
                          </div>
                          <div>
                            <p className="font-medium">Create a new project</p>
                            <p className="text-sm text-gray-600">
                              Click the "+" button on the dashboard
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg">
                          <div className="bg-secondary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            3
                          </div>
                          <div>
                            <p className="font-medium">
                              Upload your Tibetan text
                            </p>
                            <p className="text-sm text-gray-600">
                              Choose from file upload or OpenPecha
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-secondary-50 rounded-lg">
                          <div className="bg-secondary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            4
                          </div>
                          <div>
                            <p className="font-medium">
                              Start editing and translating
                            </p>
                            <p className="text-sm text-gray-600">
                              Use the editor to make changes and add
                              translations
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <LoadingIframe
                src="https://app.tango.us/app/embed/b4e75862-192c-421c-8a62-a108906559ea?theme=dark&hideHeader=true&startStep=2"
                title="Managing Projects in Pecha Editor"
              />
            </div>
          )}

          {/* Translations Tab */}
          {activeTab === "translations" && (
            <div className="space-y-6">
              <LoadingIframe
                src="https://app.tango.us/app/embed/ed05bc3a-c3fa-40ee-b514-15b3cc373fbb?theme=dark&hideHeader=true&startStep=1"
                title="Generate English Translation in Pecha Editor"
              />
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === "versions" && (
            <div className="space-y-6">
              <LoadingIframe
                src="https://app.tango.us/app/embed/cb9f485d-9d58-4ab9-837c-a92eb492e6a8"
                title="Generate English Translation in Pecha Editor"
              />
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="space-y-6">
              <LoadingIframe
                src="https://app.tango.us/app/embed/1dc4768e-3d3c-44af-a5d2-7e478b910169"
                title="Generate English Translation in Pecha Editor"
              />
            </div>
          )}

          {/* Collaboration Tab */}
          {activeTab === "collaboration" && (
            <div className="space-y-6">
              <LoadingIframe
                src="https://app.tango.us/app/embed/504d95ec-019c-4717-8347-3680464e2b5f"
                title="Generate English Translation in Pecha Editor"
              />
            </div>
          )}

          {/* Export Tab */}
          {activeTab === "export" && (
            <div className="space-y-6">
              <LoadingIframe
                src="https://app.tango.us/app/embed/4266891e-9a11-414b-bc55-7d933c83d2ba"
                title="Export and Download in Pecha Editor"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-6 py-4 text-center text-gray-500">
        <p>Need more help? Contact support or visit our community forum.</p>
      </div>
    </div>
  );
}

export default Documentation;
