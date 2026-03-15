"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Truck,
  Shield,
  RotateCcw,
  BookOpen,
  Loader2,
  Check,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productsAPI, authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function ProductPage({ params }) {

  const slug = params.slug;

  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    productsAPI
      .getBySlug(slug)
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
      authAPI
        .getFavorites()
        .then((r) => {
          setIsFavorite(
            (r.data || []).some(
              (f) => f === product._id || f._id === product._id
            )
          );
        })
        .catch(() => {});
    }
  }, [user, product]);

  const getFormatPrice = (format) => {
    if (!product) return 0;
    if (format === "digital") return product.digitalPrice || 0;
    if (format === "print-on-demand") return product.printPrice || 0;
    if (format === "physical") return product.price || 0;
    return 0;
  };

  const getFormatOriginalPrice = (format) => {
    if (!product) return 0;
    if (format === "digital" || format === "print-on-demand")
      return product.digitalPrice || product.printPrice || 0;
    if (format === "physical")
      return product.originalPrice || product.price || 0;
    return 0;
  };

  const currentPrice = getFormatPrice(selectedFormat);
  const currentOriginalPrice = getFormatOriginalPrice(selectedFormat);

  const currentDiscount =
    currentOriginalPrice > currentPrice
      ? Math.round(
          ((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100
        )
      : 0;

  const handleAddToCart = async () => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    if (!selectedFormat) return;

    if (selectedFormat === "physical" && product.stock <= 0) {
      alert("This product is currently out of stock.");
      return;
    }

    try {
      const format =
        selectedFormat === "print-on-demand"
          ? "digital"
          : selectedFormat;

      await addItem(
        product._id,
        1,
        format,
        selectedFormat === "print-on-demand"
          ? "print-on-demand"
          : null
      );

      setAddedToCart(true);

      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      const msg = error?.message || "Failed to add to cart";
      alert(msg);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      await authAPI.toggleFavorite(product._id);
      setIsFavorite(!isFavorite);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Product Not Found
          </h1>
          <Link href="/store">
            <Button className="mt-4">Browse Store</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-orange-50/20 to-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 relative">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >

          <Link href="/store">
            <Button
              variant="ghost"
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Store
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* IMAGE */}

            <div className="space-y-3">

              <div className="aspect-[4/3] rounded-2xl relative overflow-hidden flex items-center justify-center bg-gray-100 border border-gray-200">

                {product.thumbnail?.url || product.image ? (
                  <img
                    src={product.thumbnail?.url || product.image}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <BookOpen className="w-24 h-24 text-gray-300" />
                )}

              </div>

            </div>

            {/* DETAILS */}

            <div className="space-y-6">

              <div>

                <h1 className="text-3xl font-extrabold text-gray-900">
                  {product.title}
                </h1>

                {product.author && (
                  <p className="text-gray-500 mt-1">
                    by {product.author}
                  </p>
                )}

              </div>

              {/* RATING */}

              <div className="flex items-center gap-2">

                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating || 0)
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>

                <span className="text-sm text-gray-500">
                  {product.rating || 0} ({product.reviewCount || 0} reviews)
                </span>

              </div>

              {/* PRICE */}

              <div className="flex items-baseline gap-3">

                <span className="text-3xl font-extrabold text-gray-900">
                  ₹{Math.round(currentPrice)}
                </span>

                {currentDiscount > 0 && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      ₹{Math.round(currentOriginalPrice)}
                    </span>

                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {currentDiscount}% OFF
                    </span>
                  </>
                )}

              </div>

              {/* ADD TO CART */}

              <Button
                onClick={handleAddToCart}
                className="w-full py-3 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700"
              >
                {addedToCart ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>

              {/* FAVORITE + SHARE */}

              <div className="flex gap-3">

                <Button
                  variant="outline"
                  onClick={handleToggleFavorite}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isFavorite ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                </Button>

                <Button variant="outline">
                  <Share2 className="w-4 h-4" />
                </Button>

              </div>

              {/* BENEFITS */}

              <div className="grid grid-cols-3 gap-3">

                {[
                  { icon: Truck, label: "Free Shipping" },
                  { icon: Shield, label: "Genuine" },
                  { icon: RotateCcw, label: "Easy Returns" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl"
                  >
                    <Icon className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs text-gray-600 font-medium">
                      {label}
                    </span>
                  </div>
                ))}

              </div>

            </div>

          </div>

          {/* DESCRIPTION */}

          {product.description && (
            <div className="mt-12">

              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Description
              </h2>

              <p className="text-gray-600">
                {product.description}
              </p>

            </div>
          )}

        </motion.div>

      </main>

      <Footer />
    </div>
  );
}