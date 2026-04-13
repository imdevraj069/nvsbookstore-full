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
    if (!confirm("Delete this card? All associated questions will be removed.")) return;

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

  const handleSave = async () => {
    await fetchCards();
  };

  const filteredCards = cards.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">PVC Card Management</h1>
          <p className="text-gray-500 mt-2">Manage card types, variations, pricing and questions</p>
        </div>
        <Link
          href="/admin/pvc-cards/new/edit"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition font-medium"
        >
          <Plus size={20} />
          Create New Card
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by card name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Plus className="text-blue-600" size={32} />
          </div>
          <p className="text-gray-600 text-lg font-medium">No PVC cards found</p>
          <p className="text-gray-500 text-sm mt-1">Create your first PVC card type to get started</p>
          <Link
            href="/admin/pvc-cards/new/edit"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create First Card
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <div
              key={card._id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Card Image */}
              {card.thumbnailUrl && (
                <div className="h-48 overflow-hidden bg-gray-100">
                  <img
                    src={card.thumbnailUrl}
                    alt={card.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{card.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {card.description || "No description"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                      card.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {card.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Variations</p>
                    <p className="text-lg font-bold text-gray-900">
                      {card.variations?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Questions</p>
                    <p className="text-lg font-bold text-gray-900">
                      {card.questions?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                {card.variations && card.variations.length > 0 && (
                  <div className="pt-2 pb-2">
                    <p className="text-xs text-gray-500 font-medium mb-2">Price Range</p>
                    <div className="space-y-1">
                      {card.variations.slice(0, 2).map((v, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{v.name}</span>
                          <span className="font-semibold text-green-600">₹{v.price}</span>
                        </div>
                      ))}
                      {card.variations.length > 2 && (
                        <p className="text-xs text-gray-500 pt-1">
                          +{card.variations.length - 2} more {card.variations.length - 2 === 1 ? 'option' : 'options'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <Link
                    href={`/admin/pvc-cards/${card._id}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition text-sm"
                  >
                    <Edit2 size={16} />
                    Edit
                  </Link>
                  <Link
                    href={`/admin/pvc-cards/${card._id}/questions`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium transition text-sm"
                  >
                    <Settings size={16} />
                    Details
                  </Link>
                  <button
                    onClick={() => handleDelete(card._id)}
                    disabled={deleting === card._id}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition text-sm disabled:opacity-50"
                  >
                    {deleting === card._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
