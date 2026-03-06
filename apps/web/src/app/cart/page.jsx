"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { cartAPI } from "@/lib/api";

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadCart();
    else setLoading(false);
  }, [user]);

  const loadCart = async () => {
    try {
      const res = await cartAPI.get();
      setCart(res.data);
    } catch {
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  };

  const updateQty = async (itemId, qty) => {
    if (qty < 1) return;
    try {
      await cartAPI.updateItem(itemId, { quantity: qty });
      loadCart();
    } catch {}
  };

  const removeItem = async (itemId) => {
    try {
      await cartAPI.removeItem(itemId);
      loadCart();
    } catch {}
  };

  const clearCart = async () => {
    if (!confirm("Clear entire cart?")) return;
    try {
      await cartAPI.clear();
      loadCart();
    } catch {}
  };

  const items = cart?.items || [];
  const total = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-sm text-gray-500 mt-1">{items.length} item{items.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href="/store" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {authLoading || loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : !user ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Please sign in to view your cart</p>
            <Link
              href="/auth/login"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25"
            >
              Sign In
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link
              href="/store"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25"
            >
              Browse Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, idx) => (
                <motion.div
                  key={item._id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                    {item.product?.thumbnail?.url || item.product?.thumbnail?.key ? (
                      <img 
                        src={item.product.thumbnail?.url && !item.product.thumbnail.url.includes('//') ? item.product.thumbnail.url : (item.product?.thumbnail?.key ? `/files/serve/${item.product.thumbnail.key}?type=image` : '')} 
                        alt="" 
                        className="w-full h-full object-cover rounded-lg" 
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-blue-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.product?.slug || ""}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 line-clamp-2">
                      {item.product?.title || "Product"}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.format || "physical"}</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">₹{item.product?.price || 0}</p>

                    {/* Controls */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button onClick={() => updateQty(item._id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-50"><Minus className="w-3 h-3" /></button>
                        <span className="px-3 py-1 text-sm font-medium border-x border-gray-200">{item.quantity}</span>
                        <button onClick={() => updateQty(item._id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => removeItem(item._id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{(item.product?.price || 0) * item.quantity}</p>
                  </div>
                </motion.div>
              ))}

              <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600">
                Clear Cart
              </button>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </div>
                </div>
                <button className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
