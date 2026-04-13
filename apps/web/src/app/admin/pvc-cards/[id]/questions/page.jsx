"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { adminAPI } from "@/lib/api";
import PVCCardQuestionBuilder from "@/components/admin/PVCCardQuestionBuilder";
import Link from "next/link";

export default function PVCCardQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id;

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cardId) fetchCard();
  }, [cardId]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.get(`/pvc-cards/${cardId}`);
      setCard(response.data?.data?.card);
    } catch (err) {
      console.error("Error fetching card:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Card not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Link
        href="/admin/pvc-cards"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft size={18} />
        Back to PVC Cards
      </Link>

      {/* Content */}
      <PVCCardQuestionBuilder
        cardId={cardId}
        cardName={card.name}
        onClose={() => router.push("/admin/pvc-cards")}
      />
    </div>
  );
}
