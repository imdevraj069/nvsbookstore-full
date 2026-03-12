import { Suspense, useEffect } from "react";
import StoreContent from "./StoreContent";

function StoreLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading store...</p>
      </div>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<StoreLoadingFallback />}>
      <StoreContent />
    </Suspense>
  );
}
