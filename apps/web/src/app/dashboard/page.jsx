"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ordersAPI } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Package, Download, User, ShoppingBag, Loader2,
  ChevronDown, ChevronUp, FileText, Clock, CheckCircle2,
  Truck, XCircle, CreditCard, ArrowLeft, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
  pending:    { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Pending" },
  paid:       { color: "bg-green-100 text-green-700", icon: CreditCard, label: "Paid" },
  processing: { color: "bg-blue-100 text-blue-700", icon: Package, label: "Processing" },
  shipped:    { color: "bg-purple-100 text-purple-700", icon: Truck, label: "Shipped" },
  delivered:  { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Delivered" },
  cancelled:  { color: "bg-red-100 text-red-700", icon: XCircle, label: "Cancelled" },
  refunded:   { color: "bg-gray-100 text-gray-700", icon: XCircle, label: "Refunded" },
};

const TABS = [
  { id: "orders", label: "My Orders", icon: Package },
  { id: "digital", label: "Digital Library", icon: Download },
  { id: "profile", label: "Profile", icon: User },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await ordersAPI.getMyOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadOrders();
  }, [user, loadOrders]);

  // Digital products from all orders — exclude print-on-demand
  const digitalProducts = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
    .flatMap((o) =>
      (o.items || [])
        .filter((item) => {
          if (item.format !== "digital") return false;
          // Exclude print-on-demand: check subFormat (new orders) or product printPrice (old orders)
          if (item.subFormat === "print-on-demand") return false;
          if (!item.subFormat && item.product?.printPrice > 0) return false;
          // Must have a digital file
          if (!item.product?.digitalFile?.key) return false;
          return true;
        })
        .map((item) => ({ ...item, orderId: o._id, orderDate: o.createdAt }))
    );

  const handleDownloadInvoice = async (orderId) => {
    try {
      const token = localStorage.getItem("nvs_token");
      const url = ordersAPI.getInvoiceUrl(orderId);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to download invoice");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `invoice_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Failed to download invoice: " + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome back, {user.name || user.email}</p>
          </div>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === "digital" && digitalProducts.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20" : "bg-blue-100 text-blue-600"}`}>
                  {digitalProducts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Orders Tab */}
          {activeTab === "orders" && (
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
                  <p className="text-gray-500 mb-4 text-sm">Start shopping to see your orders here</p>
                  <Link href="/" className="inline-block px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    Browse Books
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const StatusIcon = sc.icon;
                    const isExpanded = expandedOrder === order._id;

                    return (
                      <div key={order._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Order Header */}
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0 text-left">
                            <div className={`p-2 rounded-lg ${sc.color}`}>
                              <StatusIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">
                                Order #{order._id.slice(-8)}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {" · "}
                                {order.items?.length || 0} item(s)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${sc.color}`}>
                              {sc.label}
                            </span>
                            <span className="font-bold text-gray-900">₹{order.price?.total?.toLocaleString("en-IN")}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>

                        {/* Expanded Detail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-100"
                            >
                              <div className="px-6 py-5">
                                {/* Items */}
                                <div className="space-y-3 mb-5">
                                  {(order.items || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                          <BookOpen className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">{item.title}</p>
                                          <p className="text-xs text-gray-400 capitalize">{item.format} × {item.quantity}</p>
                                        </div>
                                      </div>
                                      <span className="font-medium text-gray-700">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Pricing */}
                                <div className="border-t border-gray-100 pt-3 mb-4 space-y-1 text-sm">
                                  <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>₹{order.price?.subtotal?.toLocaleString("en-IN")}</span>
                                  </div>
                                  {order.price?.shipping > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                      <span>Shipping</span>
                                      <span>₹{order.price.shipping}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-gray-900 pt-1">
                                    <span>Total</span>
                                    <span>₹{order.price?.total?.toLocaleString("en-IN")}</span>
                                  </div>
                                </div>

                                {/* Order Tracking Timeline — for physical/POD orders */}
                                {(() => {
                                  const hasPhysical = (order.items || []).some(
                                    (i) => i.format === "physical" || i.subFormat === "print-on-demand"
                                  );
                                  if (!hasPhysical || order.status === "cancelled" || order.status === "refunded") return null;

                                  const steps = [
                                    { key: "paid", label: "Paid", icon: CreditCard },
                                    { key: "processing", label: "Processing", icon: Package },
                                    { key: "shipped", label: "Shipped", icon: Truck },
                                    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
                                  ];
                                  const statusOrder = steps.map((s) => s.key);
                                  const currentIdx = statusOrder.indexOf(order.status);

                                  return (
                                    <div className="border-t border-gray-100 pt-4 mb-4">
                                      <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5" /> Order Tracking
                                      </p>
                                      <div className="flex items-center justify-between">
                                        {steps.map((step, idx) => {
                                          const StepIcon = step.icon;
                                          const isCompleted = idx <= currentIdx;
                                          const isCurrent = idx === currentIdx;
                                          return (
                                            <div key={step.key} className="flex items-center flex-1">
                                              <div className="flex flex-col items-center">
                                                <div
                                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                    isCompleted
                                                      ? isCurrent
                                                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                                        : "bg-green-500 text-white"
                                                      : "bg-gray-200 text-gray-400"
                                                  }`}
                                                >
                                                  <StepIcon className="w-4 h-4" />
                                                </div>
                                                <span
                                                  className={`text-[10px] mt-1 font-medium ${
                                                    isCompleted ? (isCurrent ? "text-blue-600" : "text-green-600") : "text-gray-400"
                                                  }`}
                                                >
                                                  {step.label}
                                                </span>
                                              </div>
                                              {idx < steps.length - 1 && (
                                                <div
                                                  className={`flex-1 h-0.5 mx-1 rounded ${
                                                    idx < currentIdx ? "bg-green-400" : "bg-gray-200"
                                                  }`}
                                                />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Actions */}
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleDownloadInvoice(order._id)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                                  >
                                    <FileText className="w-4 h-4" /> Download Invoice
                                  </button>
                                  {order.trackingNumber && (
                                    <span className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-xl">
                                      <Truck className="w-4 h-4" /> {order.trackingNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Digital Library Tab */}
          {activeTab === "digital" && (
            <motion.div key="digital" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {digitalProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <Download className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No digital purchases</h3>
                  <p className="text-gray-500 text-sm">Buy digital books to access them here</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {digitalProducts.map((item, idx) => {
                    const product = item.product;
                    const imageUrl = product?.images?.[0] ? `/files/serve?key=${product.images[0]}` : null;
                    const digitalFile = product?.digitalFile;

                    return (
                      <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.title} className="w-full h-40 object-cover" />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-blue-300" />
                          </div>
                        )}
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">{item.title}</h4>
                          <p className="text-xs text-gray-400 mb-3">
                            Purchased {new Date(item.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          {digitalFile?.key ? (
                            <a
                              href={`/files/serve/${encodeURIComponent(digitalFile.key)}?type=document`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              <Download className="w-4 h-4" /> Open / Download
                            </a>
                          ) : (
                            <span className="block text-center text-xs text-gray-400 py-2">
                              File not yet available
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm max-w-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{user.name || "—"}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Member since</span>
                    <span className="font-medium text-gray-900">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Total orders</span>
                    <span className="font-medium text-gray-900">{orders.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Digital items</span>
                    <span className="font-medium text-gray-900">{digitalProducts.length}</span>
                  </div>
                </div>

                <button
                  onClick={() => { logout(); router.push("/"); }}
                  className="mt-6 w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
