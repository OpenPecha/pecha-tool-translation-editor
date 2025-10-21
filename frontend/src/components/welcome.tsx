import { Link } from "react-router-dom";
import { BookOpen, Users, Zap, CheckCircle, FileText, Languages } from "lucide-react";

export const Welcome = () => {
  const features = [
    {
      icon: <Languages className="w-6 h-6" />,
      title: "Parallel Text Editing",
      description: "Two-panel sync for source and translation side-by-side",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Real-time Collaboration",
      description: "Multiple users editing and reviewing simultaneously",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Rich Text Editing",
      description: "Powered by Quill editor with Tibetan text support",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Change Tracking",
      description: "Track versions and sync annotations",
    },
  ];

  const stats = [
    { label: "Translation Projects", value: "100+" },
    { label: "Collaborative Users", value: "50+" },
    { label: "Pecha Texts", value: "500+" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="text-center space-y-8 mb-16">
            {/* Logo/Title Section */}
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
                  <FileText className="w-20 h-20 text-blue-600 dark:text-blue-400 relative" />
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white tracking-tight">
                Buddhistai Translation Tool
              </h1>
              <p className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Collaborative Pecha Translation Editor
              </p>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                An advanced platform for translating and editing Tibetan texts with real-time collaboration, parallel text editing, and comprehensive annotation tools
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
              <Link
                to="/login"
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg rounded-2xl shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <span>Get Started</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
              {stats.map((stat, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-4xl md:text-5xl font-bold">
                    {stat.value}
                  </div>
                  <div className="text-lg opacity-90">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-16 text-center space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Why Choose Buddhistai Translation Tool?
            </h2>
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {[
                "Two-panel text synchronization",
                "Real-time collaborative editing",
                "Inline comments and suggestions",
                "STAM-powered annotation tracking",
                "Upload and edit custom pecha files",
                "WebSocket-based live updates",
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            Built with ❤️ for Tibetan text translation and preservation
          </p>
        </div>
      </div>
    </div>
  );
};

