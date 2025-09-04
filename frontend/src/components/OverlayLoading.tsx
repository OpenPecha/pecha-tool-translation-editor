import React from "react";

interface OverlayLoadingProps {
  isLoading: boolean;
}

function OverlayLoading({ isLoading }: OverlayLoadingProps) {
  if (!isLoading) return null;

  return (
    <div
      id="loading-overlay"
      style={{
        opacity: 0.7,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
      }}
      className="absolute inset-0 flex flex-col items-center justify-center z-30"
    >
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-secondary-500 mb-4"></div>
    </div>
  );
}

export default OverlayLoading;
