"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  ShoppingCart,
  Search,
  Filter,
  ChevronRight,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import Link from "next/link";

export default function PVCCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await userAPI.get("/pvc-cards");
      setCards(response.data?.data || []);
    } catch (err) {
      setError("Failed to load cards");
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg p-8">
        <h1 className="text-4xl font-bold mb-2">PVC Card Services</h1>
        <p className="text-blue-100 text-lg">
          Get official documents printed on PVC cards with verified templates
        </p>
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
          placeholder="Search PVC cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">
            {searchTerm ? "No cards found matching your search" : "No PVC cards available"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <div
              key={card._id}
              className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {card.thumbnailUrl && (
                <div className="h-48 overflow-hidden bg-gray-200">
                  <img
                    src={card.thumbnailUrl}
                    alt={card.name}
                    className="w-full h-full object-cover hover:scale-105 transition"
                  />
                </div>
              )}

              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-900">{card.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2">{card.description}</p>

                {/* Variations / Pricing */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Options</p>
                  <div className="space-y-1">
                    {card.variations.slice(0, 3).map((variation, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{variation.name}</span>
                        <span className="font-semibold text-green-600">₹{variation.price}</span>
                      </div>
                    ))}
                    {card.variations.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{card.variations.length - 3} more option{card.variations.length - 3 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={`/pvc-cards/${card._id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  <ShoppingCart size={18} />
                  Order Now
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
