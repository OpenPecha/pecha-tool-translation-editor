import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "./auth/auth-context-provider";
import { useAuth } from "./auth/use-auth-hook";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Callback from "./pages/Callback";
import Login from "./pages/Login";
import DocumentsWrapper from "./components/DocumentWrapper";
import Navbar from "./components/Dashboard/Navbar";
// import { MatomoProvider, createInstance } from "@datapunt/matomo-tracker-react";
// import RouteTracker from "./components/RouteTracker";
// Lazy loaded components
const ProjectList = lazy(() => import("./components/Dashboard/ProjectList"));
const QuillVersionProvider = lazy(() =>
  import("./contexts/VersionContext").then((module) => ({
    default: module.QuillVersionProvider,
  }))
);

const queryClient = new QueryClient();

// const instance = createInstance({
//   urlBase: "https://track.pecha.org/",
//   siteId: 3,
//   // userId: 'UID76903202', // optional, default value: `undefined`.
//   // trackerUrl: 'https://LINK.TO.DOMAIN/tracking.php', // optional, default value: `${urlBase}matomo.php`
//   srcUrl: "https://track.pecha.org/matomo.js", // optional, default value: `${urlBase}matomo.js`
//   disabled: false, // optional, false by default. Makes all tracking calls no-ops if set to true.
//   heartBeat: {
//     active: true, // optional, default value: true
//     seconds: 20, // optional, default value: `15
//   },
//   linkTracking: false, // optional, default value: true
//   configurations: {
//     // optional, default value: {}
//     // any valid matomo configuration, all below are optional
//     disableCookies: false, //required concent
//     setSecureCookie: true,
//     setRequestMethod: "POST",
//   },
// });

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, isLoading, getToken } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      getToken().then((token) => {
        localStorage.setItem("access_token", token!);
      });
      return;
    }
    if (!isAuthenticated && !isLoading) {
      console.log("No active session detected, attempting silent login");
      login(true);
    }
  }, [isAuthenticated]);
  if (!isAuthenticated) return null;

  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">Loading...</div>
  );
}

function AppContent() {
  return (
    <div className="flex flex-col h-full ">
      {/* <RouteTracker /> */}
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Navbar />
              <ProjectList />
            </Layout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />

        <Route
          path="/documents/:id"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <QuillVersionProvider>
                <DocumentsWrapper />
              </QuillVersionProvider>
            </Suspense>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* <MatomoProvider value={instance}> */}
        <AppContent />
        {/* </MatomoProvider> */}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
