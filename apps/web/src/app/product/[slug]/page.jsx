"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Heart, Share2, Star, Truck, Shield,
  RotateCcw, BookOpen, Loader2, Check
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productsAPI, cartAPI, authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ProductPage({ params }) {
  const param = React.use(params);
  const slug = param.slug;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState("physical");
  const [addedToCart, setAddedToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    productsAPI.getBySlug(slug)
      .then((r) => {
        setProduct(r.data);
        if (r.data?.formats?.length) setSelectedFormat(r.data.formats[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user && product) {
      authAPI.getFavorites().then((r) => {
        setIsFavorite((r.data || []).some((f) => f === product._id || f._id === product._id));
      }).catch(() => {});
    }
  }, [user, product]);

  const handleAddToCart = async () => {
    if (!user) { window.location.href = "/auth/login"; return; }
    try {
      await cartAPI.addItem({ productId: product._id, quantity: 1, format: selectedFormat });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch {}
  };

  const handleToggleFavorite = async () => {
    if (!user) { window.location.href = "/auth/login"; return; }
    try {
      await authAPI.toggleFavorite(product._id);
      setIsFavorite(!isFavorite);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Product Not Found</h1>
          <Link href="/store"><Button className="mt-4">Browse Store</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/store">
            <Button variant="ghost" className="mb-6 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Store
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left — Image */}
            <div className="space-y-3">
              <div className={`aspect-[4/3] rounded-2xl relative overflow-hidden flex items-center justify-center ${!(product.thumbnail?.url || product.image) ? `bg-gradient-to-br ${product.gradient || 'from-blue-600 to-indigo-700'}` : "bg-gray-100 border border-gray-200"}`}>
                {(product.thumbnail?.url || product.image) ? (
                  <img src={product.thumbnail?.url || product.image} alt={product.title} className="w-full h-full object-contain" />
                ) : (
                  <BookOpen className="w-24 h-24 text-white/20" />
                )}
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 text-gray-800 font-semibold text-sm rounded-full shadow-sm">
                    {product.badge}
                  </span>
                )}
              </div>
              {/* Image gallery strip */}
              {product.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <div key={idx} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right — Details */}
            <div className="space-y-6">
              <div>
                <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wider mb-1">
                  {product.category?.name || product.tags?.[0] || ""}
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {product.title}
                </h1>
                {product.author && (
                  <p className="text-gray-500 mt-1">by {product.author}</p>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{product.rating || 0} ({product.reviewCount || 0} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-gray-900">₹{product.price}</span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">₹{product.originalPrice}</span>
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Formats */}
              {product.formats?.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Format</p>
                  <div className="flex gap-2">
                    {product.formats.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFormat(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          selectedFormat === f
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm shadow-lg transition-all ${
                    addedToCart
                      ? "bg-green-600 hover:bg-green-700 shadow-green-500/25"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
                  }`}
                >
                  {addedToCart ? <><Check className="w-4 h-4 mr-1" /> Added!</> : <><ShoppingCart className="w-4 h-4 mr-1" /> Add to Cart</>}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className={`px-4 rounded-xl ${isFavorite ? "text-red-500 border-red-200 bg-red-50" : ""}`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500" : ""}`} />
                </Button>
                <Button variant="outline" className="px-4 rounded-xl">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Truck, label: "Free Shipping" },
                  { icon: Shield, label: "Genuine" },
                  { icon: RotateCcw, label: "Easy Returns" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl">
                    <Icon className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs text-gray-600 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {/* Book Details */}
              <Card className="border-gray-200">
                <CardHeader className="pb-2"><CardTitle className="text-base">Book Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {product.publisher && <div className="flex justify-between"><span className="text-gray-500">Publisher</span><span className="font-medium">{product.publisher}</span></div>}
                  {product.pages > 0 && <div className="flex justify-between"><span className="text-gray-500">Pages</span><span className="font-medium">{product.pages}</span></div>}
                  {product.isbn && <div className="flex justify-between"><span className="text-gray-500">ISBN</span><span className="font-medium">{product.isbn}</span></div>}
                  {product.language?.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Language</span><span className="font-medium">{product.language.join(", ")}</span></div>}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Description */}
          {(product.description || product.longDescription) && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
              <div className="prose prose-sm max-w-none text-gray-600">
                <p>{product.description}</p>
                {product.longDescription && <div className="mt-4" dangerouslySetInnerHTML={{ __html: product.longDescription }} />}
              </div>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
