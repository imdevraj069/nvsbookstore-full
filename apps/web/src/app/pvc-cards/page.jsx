"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  ShoppingCart,
  Search,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Zap,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PVCCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await userAPI.getPVCCards();
      setCards(response.data || []);
    } catch (err) {
      if (err.message?.includes("404")) {
        setCards([]);
        setError("");
      } else {
        setError("Failed to load PVC cards. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Vibrant Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-2xl p-8 sm:p-12">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/20">
              <Sparkles size={14} className="text-yellow-300 animate-pulse" />
              <span>Premium Quality HD PVC Printing</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-sm leading-tight">
              Official PVC Card Services
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed font-normal">
              Convert your Aadhar, Driving License, Voter ID, and official documents into durable, water-proof, scratch-resistant PVC smart cards with high-definition laser printing.
            </p>

            <div className="pt-2 flex flex-wrap gap-6 text-xs sm:text-sm text-blue-200 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>100% Waterproof & Durable</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-cyan-400" />
                <span>Standard ID Card Ratio (3:4)</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <span>Fast Doorstep Dispatch</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search PVC cards (e.g. Aadhar, Driving License)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{filteredCards.length}</span> cards available
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm shadow-sm">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-80 space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={44} />
            <p className="text-gray-500 text-sm font-medium">Loading PVC Cards catalog...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm p-8">
            <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-gray-800">No PVC Cards Found</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
              {searchTerm ? `No cards match "${searchTerm}". Try a different keyword.` : "No PVC card products are available currently."}
            </p>
          </div>
        ) : (
          /* Cards Grid (3:4 Aspect Ratio ID Cards Layout) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredCards.map((card) => {
              const lowestPrice = card.variations?.length
                ? Math.min(...card.variations.map((v) => v.price))
                : 0;

              return (
                <Link
                  key={card._id}
                  href={`/pvc-cards/${card._id}`}
                  className="group flex flex-col items-center"
                >
                  {/* Card Image Container (Standard 3:4 Vertical ID Card Ratio) */}
                  <div className="w-full aspect-[3/4] relative rounded-2xl bg-gradient-to-br from-slate-900/5 via-blue-900/5 to-slate-900/10 border border-gray-200/80 shadow-sm group-hover:shadow-2xl group-hover:scale-[1.03] group-hover:border-blue-500 transition-all duration-300 overflow-hidden flex items-center justify-center p-3">
                    {card.thumbnailUrl ? (
                      <img
                        src={card.thumbnailUrl}
                        alt={card.name}
                        className="w-full h-full object-contain rounded-xl drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 space-y-2 p-4 text-center">
                        <CreditCard size={40} className="text-blue-600/40" />
                        <span className="text-[11px] font-semibold text-gray-500">PVC Card Template</span>
                      </div>
                    )}

                    {/* Standard Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded-md backdrop-blur-md border border-white/20">
                        PVC Card
                      </span>
                    </div>
                  </div>

                  {/* Card Info Directly Below Image */}
                  <div className="w-full text-center mt-3 space-y-1">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {card.name}
                    </h3>
                    
                    {lowestPrice > 0 && (
                      <p className="text-xs font-semibold text-emerald-600">
                        Starting from <span className="text-sm font-black text-emerald-700">₹{lowestPrice}</span>
                      </p>
                    )}

                    <div className="pt-1">
                      <span className="inline-flex items-center justify-center gap-1 w-full px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm">
                        <ShoppingCart size={13} />
                        Order Card
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
