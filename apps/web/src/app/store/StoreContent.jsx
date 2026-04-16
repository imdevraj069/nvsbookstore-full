"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Filter,
  X,
  ChevronDown,
  ShoppingCart,
  BookOpen,
  Search,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { productsAPI, tagsAPI } from "@/lib/api";

// ── Levenshtein distance for fuzzy matching ──
function levenshteinDistance(str1, str2) {
  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();
  const len1 = lower1.length;
  const len2 = lower2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = lower1[i - 1] === lower2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
}

// ── Smart search with fuzzy matching ──
function smartSearch(query, products) {
  if (!query.trim()) return products;

  const queryLower = query.toLowerCase();
  const scored = products.map((product) => {
    let score = 0;

    // Exact match in title (highest priority)
    if (product.title.toLowerCase().includes(queryLower)) {
      score += 100;
    }

    // Levenshtein distance for title (handles typos)
    const titleDistance = levenshteinDistance(queryLower, product.title);
    if (titleDistance <= 3) {
      score += Math.max(0, 50 - titleDistance * 10);
    }

    // Description/bio contains exact match
    if (product.description?.toLowerCase().includes(queryLower)) {
      score += 40;
    }

    // Author match
    if (product.author?.toLowerCase().includes(queryLower)) {
      score += 50;
    }

    // Tags match (for "bio" searching in "biology")
    if (product.tags?.some((tag) => tag.toLowerCase().includes(queryLower))) {
      score += 35;
    }

    // Check if any tag contains the query or vice versa (partial matches)
    if (product.tags?.some((tag) => {
      const tagLower = tag.toLowerCase();
      const distance = levenshteinDistance(queryLower, tagLower);
      return distance <= 2;
    })) {
      score += 30;
    }

    // Category match
    if (product.category?.name.toLowerCase().includes(queryLower)) {
      score += 25;
    }

    return { ...product, score };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...product }) => product);
}

const priceRanges = [
  { id: "under-300", label: "Under ₹300", min: 0, max: 300 },
  { id: "300-500", label: "₹300 – ₹500", min: 300, max: 500 },
  { id: "500-1000", label: "₹500 – ₹1000", min: 500, max: 1000 },
  { id: "above-1000", label: "Above ₹1000", min: 1000, max: Infinity },
];
const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
];

export default function StoreContent() {
  const searchParams = useSearchParams();
  const tagParam = searchParams.get("tag");
  
  const [products, setProducts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(tagParam || "all");
  const [selectedPrices, setSelectedPrices] = useState([]);
  const [selectedSort, setSelectedSort] = useState("featured");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const debounceTimerRef = useRef(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update selected tag if URL parameter changes and scroll to top
  useEffect(() => {
    if (tagParam && tagParam !== selectedTag) {
      setSelectedTag(tagParam);
      window.scrollTo(0, 0);
    }
  }, [tagParam]);

  useEffect(() => {
    loadProducts();
    tagsAPI.getAll().then((r) => setTags((r.data || []).filter((t) => t.type === "product" || t.type === "both"))).catch(() => {});
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll();
      setProducts(res.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler with smart filtering
  const handleSearchInput = (value) => {
    setSearchQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search (300ms delay)
    debounceTimerRef.current = setTimeout(() => {
      if (!value.trim()) {
        loadProducts();
      } else {
        // Use smart search algorithm on local products
        const filtered = smartSearch(value, products);
        setProducts(filtered);
      }
    }, 300);
  };

  const togglePrice = (priceId) => {
    setSelectedPrices((prev) =>
      prev.includes(priceId) ? prev.filter((p) => p !== priceId) : [...prev, priceId]
    );
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (selectedTag !== "all") {
      filtered = filtered.filter((p) => p.tags?.includes(selectedTag));
    }
    if (selectedPrices.length > 0) {
      filtered = filtered.filter((p) => {
        return selectedPrices.some((priceId) => {
          const range = priceRanges.find((r) => r.id === priceId);
          return range && p.price >= range.min && p.price < range.max;
        });
      });
    }
    switch (selectedSort) {
      case "featured": filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case "newest": filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case "price-low": filtered.sort((a, b) => a.price - b.price); break;
      case "price-high": filtered.sort((a, b) => b.price - a.price); break;
      case "rating": filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      default: filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return filtered;
  }, [products, selectedTag, selectedPrices, selectedSort]);

  const hasActiveFilters = selectedTag !== "all" || selectedPrices.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-background">
      <Header />

      {/* ── Vibrant Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-red-400/20 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-sm">📚 Book Store</h1>
          <p className="text-white/80 text-sm mt-2">{filteredProducts.length} books available — find your next read</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search + Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && window.scrollTo(0, 0)}
                placeholder="Search books..."
                className="w-full pl-10 pr-4 py-2.5 border border-amber-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden p-2.5 border border-gray-300 rounded-xl text-gray-600"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Quick Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { slug: "all", label: "All", icon: "📚" },
            { slug: "books", label: "Books", icon: "📖" },
            { slug: "notes", label: "Notes", icon: "📝" },
            { slug: "photo-frame", label: "Photo Frame", icon: "🖼️" },
          ].map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedTag(cat.slug === "all" ? "all" : cat.slug)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                selectedTag === cat.slug || (cat.slug === "all" && selectedTag === "all")
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30 scale-105"
                  : "bg-white text-gray-700 border border-amber-200 hover:border-orange-300 hover:bg-orange-50"
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className={`w-64 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="bg-gradient-to-b from-white to-amber-50/50 rounded-xl border border-amber-200/60 p-5 sticky top-24 space-y-6 shadow-sm">
              {/* Tags filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedTag("all")}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm ${selectedTag === "all" ? "bg-orange-50 text-orange-700 font-medium" : "text-gray-600 hover:bg-orange-50/50"}`}
                  >
                    All Books
                  </button>
                  {tags.map((t) => (
                    <button
                      key={t.slug}
                      onClick={() => setSelectedTag(t.slug)}
                      className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm ${selectedTag === t.slug ? "bg-orange-50 text-orange-700 font-medium" : "text-gray-600 hover:bg-orange-50/50"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
                <div className="space-y-2">
                  {priceRanges.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPrices.includes(r.id)}
                        onChange={() => togglePrice(r.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {sortOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => { setSelectedTag("all"); setSelectedPrices([]); }}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">No books found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product._id || product.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProductCard({ product }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  // Build image URL: prefer thumbnail.url, fall back to thumbnail.key, then image
  let imageUrl = product.thumbnail?.url || product.image;
  if (product.thumbnail?.key && (!imageUrl || imageUrl.includes('//'))) {
    imageUrl = `/files/serve/${product.thumbnail.key}?type=image`;
  }
  const isOutOfStock = product.stock === 0;
  const categoryName = product.category?.name || "";

  return (
    <Link href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden h-full border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group">
          <div className={`aspect-[5/3] relative overflow-hidden ${!imageUrl ? `bg-gradient-to-br ${product.gradient || 'from-blue-600 to-indigo-700'}` : "bg-gray-100"}`}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                <BookOpen className="w-12 h-12" />
              </div>
            )}

            {/* Category badge */}
            {categoryName && (
              <span className="absolute top-2 right-2 text-[10px] font-semibold text-white bg-blue-800/90 px-2 py-0.5 rounded backdrop-blur-sm z-10">
                {categoryName}
              </span>
            )}

            {discount > 0 && (
              <Badge variant="destructive" className="absolute top-2 left-2 text-[10px] z-10">
                {discount}% OFF
              </Badge>
            )}

            {product.badge && !discount && (
              <Badge className="absolute top-2 left-2 text-[10px] bg-white/90 text-gray-800 shadow-sm border-0 backdrop-blur-sm z-10">
                {product.badge}
              </Badge>
            )}

            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                <span className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full">Out of Stock</span>
              </div>
            )}
          </div>

          <CardContent className="p-3 space-y-1.5">
            <h4 className="font-semibold text-gray-900 leading-snug text-sm line-clamp-2 group-hover:text-indigo-700 transition-colors">
              {product.title || product.name}
            </h4>
            {product.author && (
              <p className="text-xs text-gray-400 truncate">{product.author}</p>
            )}
            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>

            {isOutOfStock ? (
              <span className="text-xs font-semibold text-red-600">Out of Stock</span>
            ) : (
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-base font-extrabold text-gray-900">₹{product.price}</span>
                {product.originalPrice > product.price && (
                  <span className="text-xs text-gray-400 line-through">₹{product.originalPrice}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
