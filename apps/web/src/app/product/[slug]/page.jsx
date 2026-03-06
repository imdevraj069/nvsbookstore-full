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
import { useCart } from "@/context/CartContext";

export default function ProductPage({ params }) {
  const param = React.use(params);
  const slug = param.slug;
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    productsAPI.getBySlug(slug)
      .then((r) => {
        setProduct(r.data);
        if (r.data?.formats?.length) {
          setSelectedFormat(r.data.formats[0]);
        }
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

  // Calculate price based on selected format
  const getFormatPrice = (format) => {
    if (!product) return 0;
    if (format === 'digital') return product.digitalPrice || 0;
    if (format === 'print-on-demand') return product.printPrice || 0;
    if (format === 'physical') return product.price || 0;
    return 0;
  };

  const getFormatOriginalPrice = (format) => {
    if (!product) return 0;
    if (format === 'digital' || format === 'print-on-demand') return product.digitalPrice || product.printPrice || 0;
    if (format === 'physical') return product.originalPrice || product.price || 0;
    return 0;
  };

  const currentPrice = getFormatPrice(selectedFormat);
  const currentOriginalPrice = getFormatOriginalPrice(selectedFormat);
  const currentDiscount = currentOriginalPrice > currentPrice 
    ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (!user) { window.location.href = "/auth/login"; return; }
    if (!selectedFormat) return;
    // Out-of-stock guard for physical products
    if (selectedFormat === 'physical' && product.stock <= 0) {
      alert('This product is currently out of stock.');
      return;
    }
    try {
      const format = selectedFormat === 'print-on-demand' ? 'digital' : selectedFormat;
      await addItem(
        product._id, 
        1, 
        format,
        selectedFormat === 'print-on-demand' ? 'print-on-demand' : null
      );
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      const msg = error?.message || 'Failed to add to cart';
      alert(msg);
    }
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
                {(() => {
                  let imageUrl = product.thumbnail?.url || product.image;
                  if (product.thumbnail?.key && (!imageUrl || imageUrl.includes('//'))) {
                    imageUrl = `/files/serve/${product.thumbnail.key}?type=image`;
                  }
                  return imageUrl ? (
                    <img src={imageUrl} alt={product.title} className="w-full h-full object-contain" />
                  ) : (
                    <BookOpen className="w-24 h-24 text-white/20" />
                  );
                })()}
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 text-gray-800 font-semibold text-sm rounded-full shadow-sm">
                    {product.badge}
                  </span>
                )}
              </div>
              {/* Image gallery strip */}
              {product.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => {
                    let imageUrl = img;
                    // Check if img is an object with url/key or a string
                    if (typeof img === 'object' && img.url) {
                      if (img.key && (!img.url || img.url.includes('//'))) {
                        imageUrl = `/files/serve/${img.key}?type=image`;
                      } else {
                        imageUrl = img.url;
                      }
                    }
                    return (
                      <div key={idx} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={imageUrl} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-contain" />
                      </div>
                    );
                  })}
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
                <span className="text-3xl font-extrabold text-gray-900">₹{Math.round(currentPrice)}</span>
                {currentDiscount > 0 && (
                  <>
                    <span className="text-lg text-gray-400 line-through">₹{Math.round(currentOriginalPrice)}</span>
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {currentDiscount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Formats */}
              {product.formats?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Format</p>
                  <div className="flex flex-wrap gap-2">
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
                        {f} ₹{Math.round(f === 'digital' ? (product.digitalPrice || 0) : (product.price || 0))}
                      </button>
                    ))}
                    {/* Print on Demand - only for digital products */}
                    {(selectedFormat === 'digital' || selectedFormat === 'print-on-demand') && product.isPrintable && (
                      <button
                        onClick={() => setSelectedFormat('print-on-demand')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          selectedFormat === 'print-on-demand'
                            ? "bg-amber-600 text-white shadow-lg shadow-amber-500/25"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Print on Demand ₹{Math.round(product.printPrice || 0)}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedFormat || currentPrice <= 0 || (selectedFormat === 'physical' && product.stock <= 0)}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    addedToCart
                      ? "bg-green-600 hover:bg-green-700 shadow-green-500/25"
                      : (selectedFormat === 'physical' && product.stock <= 0)
                        ? "bg-gray-400"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
                  }`}
                >
                  {addedToCart ? <><Check className="w-4 h-4 mr-1" /> Added!</> : (selectedFormat === 'physical' && product.stock <= 0) ? 'Out of Stock' : <><ShoppingCart className="w-4 h-4 mr-1" /> Add to Cart</>}
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

              {/* Format-specific notes */}
              {selectedFormat === 'digital' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  📱 You will receive a download link immediately after purchase.
                </div>
              )}
              {selectedFormat === 'print-on-demand' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  🖨️ Your copy will be printed and shipped within 5-7 business days.
                </div>
              )}
              {selectedFormat === 'physical' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  📦 Standard shipping: Free for orders above ₹500.
                </div>
              )}

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
