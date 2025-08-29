import { useAuth } from "@/auth/use-auth-hook";
import { useTokenExpiration } from "@/hooks/useTokenExpiration";
import { Suspense, useEffect } from "react";
import OpenPecha from "@/assets/icon.png";
import Footer from "./Footbar";
import Navbar from "./Navbar";


export const LoadingFallback: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="text-gray-600 text-sm">Loading translations...</p>
      </div>
    </div>
  );

function LoaderWithLogo(){
    return <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
    <div className="flex flex-col items-center space-y-6">
      <div className="flex items-center space-x-3">
        <img
          src={OpenPecha}
          alt="OpenPecha"
          className="w-12 h-12 animate-pulse"
        />
        <h1 className="text-2xl font-semibold text-gray-500">OpenPecha</h1>
      </div>

      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    </div>
  </div>
}

export function SuspenceWithLoadingFallback({children}: {children: React.ReactNode}) {
  return (
    <Suspense fallback={<LoaderWithLogo />}>
      {children}
    </Suspense>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, login, isLoading, getToken } = useAuth();
  
    // Hook to automatically check token expiration and logout if expired
    useTokenExpiration();
  
    useEffect(() => {
      if (isAuthenticated) {
        getToken().then((token) => {
          localStorage.setItem("access_token", token!);
        });
        return;
      }
      if (!isAuthenticated && !isLoading) {
        login(true);
      }
    }, [isAuthenticated, isLoading]);
    if (!isAuthenticated) return null;
  
    return <SuspenceWithLoadingFallback>
            <Navbar />
             {children}
             <Footer />
        </SuspenceWithLoadingFallback>;
  }