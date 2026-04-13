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
import PVCCardForm from "@/components/admin/PVCCardForm";
import Link from "next/link";

export default function PVCCardManagement() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
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
      if (response.data?.success) {
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
    setShowForm(false);
    setEditingCard(null);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PVC Cards</h1>
          <p className="text-gray-600 mt-1">{cards.length} card type{cards.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => {
            setEditingCard(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Card Type
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No PVC cards found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card._id}
              className="bg-white border rounded-lg p-6 hover:shadow-lg transition"
            >
              {card.thumbnailUrl && (
                <img
                  src={card.thumbnailUrl}
                  alt={card.name}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}

              <h3 className="text-lg font-bold text-gray-900">{card.name}</h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{card.description}</p>

              {/* Variations */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase">Variations</p>
                <div className="space-y-1">
                  {card.variations.map((variation, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{variation.name}</span>
                      <span className="font-semibold text-green-600">₹{variation.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    card.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {card.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-2">
                <Link
                  href={`/admin/pvc-cards/${card._id}/questions`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  <Settings size={16} />
                  Questions
                </Link>
                <button
                  onClick={() => {
                    setEditingCard(card);
                    setShowForm(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(card._id)}
                  disabled={deleting === card._id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                >
                  {deleting === card._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <PVCCardForm
          card={editingCard}
          onClose={() => {
            setShowForm(false);
            setEditingCard(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
