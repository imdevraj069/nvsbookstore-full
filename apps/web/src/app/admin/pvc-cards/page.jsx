"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Settings,
  Search,
  CreditCard,
  CheckCircle2,
  HelpCircle,
  Layers,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import Link from "next/link";

export default function PVCCardManagement() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPVCCards();
      setCards(response.data || []);
    } catch (err) {
      setError("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId) => {
    if (!confirm("Delete this PVC card? All associated questions will be permanently removed.")) return;

    try {
      setDeleting(cardId);
      const response = await adminAPI.deletePVCCard(cardId);
      if (response.success) {
        await fetchCards();
      }
    } catch (err) {
      setError("Failed to delete card");
    } finally {
      setDeleting(null);
    }
  };

  const filteredCards = cards.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.description && card.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCardsCount = cards.filter((c) => c.isActive).length;
  const totalVariationsCount = cards.reduce((acc, c) => acc + (c.variations?.length || 0), 0);
  const totalQuestionsCount = cards.reduce((acc, c) => acc + (c.questions?.length || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">PVC Card Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">Manage card templates, variations, dynamic questions, and pricing</p>
        </div>
        <Link
          href="/admin/pvc-cards/new/edit"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-xl transition font-semibold text-sm"
        >
          <Plus size={18} />
          Create New PVC Card
        </Link>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cards</p>
            <p className="text-2xl font-black text-gray-900">{cards.length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Cards</p>
            <p className="text-2xl font-black text-gray-900">{activeCardsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Variations</p>
            <p className="text-2xl font-black text-gray-900">{totalVariationsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Questions</p>
            <p className="text-2xl font-black text-gray-900">{totalQuestionsCount}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search PVC cards by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm shadow-sm"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm shadow-sm">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 shadow-sm">
          <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-gray-800">No PVC Cards Found</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
            {searchTerm ? `No cards match "${searchTerm}".` : "Start by creating your first PVC card type."}
          </p>
          <Link
            href="/admin/pvc-cards/new/edit"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition shadow-sm"
          >
            <Plus size={16} />
            Create First Card
          </Link>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <div
              key={card._id}
              className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* 3:4 Aspect Ratio Thumbnail Preview Header */}
                <div className="p-4 bg-gradient-to-br from-slate-900/5 to-slate-900/10 border-b border-gray-100 flex items-center justify-center">
                  <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center relative group">
                    {card.thumbnailUrl ? (
                      <img
                        src={card.thumbnailUrl}
                        alt={card.name}
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <CreditCard className="text-gray-300" size={32} />
                    )}
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                      3:4 Demo
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-extrabold text-gray-900 line-clamp-1">{card.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {card.description || "No description provided"}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                        card.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {card.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Summary Pills */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100/80">
                      <p className="text-[10px] font-bold text-blue-600 uppercase">Variations</p>
                      <p className="text-base font-black text-blue-900">{card.variations?.length || 0}</p>
                    </div>
                    <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100/80">
                      <p className="text-[10px] font-bold text-purple-600 uppercase">Questions</p>
                      <p className="text-base font-black text-purple-900">{card.questions?.length || 0}</p>
                    </div>
                  </div>

                  {/* Price Preview */}
                  {card.variations && card.variations.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Variations & Pricing</p>
                      {card.variations.slice(0, 2).map((v, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-700 font-medium truncate max-w-[140px]">{v.name}</span>
                          <span className="font-bold text-emerald-600">₹{v.price}</span>
                        </div>
                      ))}
                      {card.variations.length > 2 && (
                        <p className="text-[10px] text-gray-400 font-medium pt-0.5">
                          +{card.variations.length - 2} more variation{card.variations.length - 2 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                <Link
                  href={`/admin/pvc-cards/${card._id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Edit2 size={14} />
                  Edit Card
                </Link>
                <Link
                  href={`/admin/pvc-cards/${card._id}/questions`}
                  className="flex items-center justify-center py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-semibold transition"
                  title="Manage Questions"
                >
                  <Settings size={14} />
                </Link>
                <button
                  onClick={() => handleDelete(card._id)}
                  disabled={deleting === card._id}
                  className="flex items-center justify-center py-2 px-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  title="Delete Card"
                >
                  {deleting === card._id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
