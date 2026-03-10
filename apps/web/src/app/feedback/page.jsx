'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function FeedbackContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3">
              Share Your Feedback
            </h1>
            <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
              Your feedback helps us improve. Tell us about your experience with NVS BookStore!
            </p>
          </div>
          <div className="absolute -bottom-4 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -top-4 -left-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <FeedbackForm orderId={orderId} />
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="text-center py-16">Loading...</div>}>
      <FeedbackContent />
    </Suspense>
  );
}
