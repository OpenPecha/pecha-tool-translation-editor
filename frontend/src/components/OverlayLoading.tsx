import React from "react";

function OverlayLoading({ isLoading }) {
  if (!isLoading) return null;
  return (
    <div
      id="loading-overlay"
      style={{
        opacity: 0.4,
      }}
      className="absolute inset-0 flex items-center justify-center bg-gray-800  z-50"
    >
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
    </div>
  );
}

export default OverlayLoading;
