"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import {
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProductShowcase({ products: apiProducts, moreOnly = false }) {
  const products = apiProducts?.length ? apiProducts : [];
  const featuredProduct = products.find(p => p.isEditorPick) || null;
  const scrollContainerRef = useRef(null);
  const featuredScrollRef = useRef(null);
  // Show all featured products (remove limit)
  const featuredProducts = products.filter(p => p.isFeatured && p !== featuredProduct);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const scrollFeatured = (direction) => {
    if (featuredScrollRef.current) {
      const scrollAmount = 300;
      featuredScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // ── moreOnly mode: only the horizontal scroll section ──
  if (moreOnly) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-8" id="more-books">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              More Products
            </h3>
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 hover:bg-indigo-100 rounded-full transition-colors text-indigo-600"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 hover:bg-indigo-100 rounded-full transition-colors text-indigo-600"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x scroll-smooth gap-3 pb-2 -mx-4 px-4 overscroll-x-contain scrollbar-style">
            {products.map((product) => (
              <Link key={product._id || product.id} href={`/product/${product.slug}`} className="flex-shrink-0 snap-start w-48 sm:w-56 block">
                <ProductCard product={product} compact />
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/store">
              <Button
                variant="outline"
                className="rounded-full px-6 font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                View All Books
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    );
  }

  // ── Default mode: featured hero grid ──
  return (
    <section className="max-w-7xl mx-auto px-4 py-8" id="books">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Featured Products
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Top picks for competitive exam preparation
          </p>
        </div>
        <Link href="/store">
          <Button
            variant="ghost"
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold hidden sm:flex"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </motion.div>

      {/* Split Layout - Full Width Featured Section */}
      {products.length > 0 && (
      <div className="w-full grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
        {/* Featured Product — Slightly Larger Card */}
        {featuredProduct && (
        <Link href={`/product/${featuredProduct.slug}`}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="overflow-hidden h-full border-0 shadow-lg group cursor-pointer">
            <div
              className={`aspect-[4/3] lg:aspect-auto lg:h-full bg-gradient-to-br ${featuredProduct.gradient || 'from-blue-600 to-indigo-700'} relative p-6 flex flex-col justify-between min-h-[320px]`}
            >
              {/* Real thumbnail background */}
              {(() => {
                let imageUrl = featuredProduct.thumbnail?.url || featuredProduct.image;
                if (featuredProduct.thumbnail?.key && (!imageUrl || imageUrl.includes('//'))) {
                  imageUrl = `/files/serve/${featuredProduct.thumbnail.key}?type=image`;
                }
                return imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={featuredProduct.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                ) : null;
              })()}
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              <div className="relative z-10 space-y-4">
                {featuredProduct.badge && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {featuredProduct.badge}
                  </Badge>
                )}
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                    {featuredProduct.category?.name || featuredProduct.tags?.[0] || ''}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    {featuredProduct.title || featuredProduct.name}
                  </h3>
                </div>
                <p className="text-white/80 text-sm leading-relaxed max-w-sm">
                  {featuredProduct.description}
                </p>

                {/* Features / Tags */}
                <div className="flex flex-wrap gap-2">
                  {(featuredProduct.features || featuredProduct.tags || []).slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-1 bg-white/15 rounded-full text-white/90 backdrop-blur-sm"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative z-10 flex items-end justify-between mt-4">
                <div>
                  <span className="text-2xl font-extrabold text-white">
                    ₹{featuredProduct.price}
                  </span>
                  {featuredProduct.originalPrice > featuredProduct.price && (
                    <span className="text-white/50 line-through text-sm ml-2">
                      ₹{featuredProduct.originalPrice}
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  className="rounded-full shadow-lg px-5 font-semibold"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Add to Cart
                </Button>
              </div>

              {/* Floating blur circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
            </div>
          </Card>
        </motion.div>
        </Link>
        )}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">All Featured Products</h3>
            <div className="flex gap-2">
              <button
                onClick={() => scrollFeatured('left')}
                className="p-1.5 hover:bg-indigo-100 rounded-full transition-colors text-indigo-600"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollFeatured('right')}
                className="p-1.5 hover:bg-indigo-100 rounded-full transition-colors text-indigo-600"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div ref={featuredScrollRef} className="flex overflow-x-auto snap-x scroll-smooth gap-3 pb-2 -mx-4 px-4 overscroll-x-contain scrollbar-style">
            {featuredProducts.map((product) => (
              <Link key={product._id || product.id} href={`/product/${product.slug}`} className="flex-shrink-0 snap-start w-40 sm:w-48 block">
                <ProductCard product={product} compact />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
      )}
    </section>
  );
}

function ProductCard({ product, compact = false }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  let imageUrl = product.thumbnail?.url || product.image;
  if (product.thumbnail?.key && (!imageUrl || imageUrl.includes('//'))) {
    imageUrl = `/files/serve/${product.thumbnail.key}?type=image`;
  }
  const isOutOfStock = product.stock === 0;
  const categoryName = product.category?.name || product.tags?.[0] || "";

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden h-full border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group">
        {/* Image */}
        <div
          className={`${
            compact ? "aspect-[3/2]" : "aspect-[5/3]"
          } relative overflow-hidden ${!imageUrl ? `bg-gradient-to-br ${product.gradient || "from-blue-600 to-indigo-700"}` : "bg-gray-100"}`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title || product.name}
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

          {/* Hover overlay */}
          {!isOutOfStock && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full shadow-lg text-xs px-3"
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-1.5">
          <h4
            className={`font-semibold text-gray-900 leading-snug ${
              compact ? "text-xs line-clamp-2" : "text-sm line-clamp-2"
            }`}
          >
            {product.title || product.name}
          </h4>
          {product.author && (
            <p className="text-xs text-gray-400 truncate">{product.author}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-1">
            {product.description}
          </p>
          {isOutOfStock ? (
            <span className="text-xs font-semibold text-red-600">Out of Stock</span>
          ) : (
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-base font-extrabold text-gray-900">
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
