"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminAPI, tagsAPI } from "@/lib/api";
import {
  Package, Bell, Tags, ShoppingCart, Plus, Trash2, Edit,
  LayoutDashboard, ChevronRight, Search, Loader2, X, Save, Truck
} from "lucide-react";

// ═══════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("products");
  const [items, setItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUpdating, setTrackingUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/auth/login");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadTags();
    }
  }, [activeTab, isAdmin]);

  const loadTags = async () => {
    try {
      const res = await tagsAPI.getAll();
      setTags(res.data || []);
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let res;
      switch (activeTab) {
        case "products":
          res = await adminAPI.getProducts();
          break;
        case "notifications":
          res = await adminAPI.getNotifications();
          break;
        case "tags":
          res = await adminAPI.getTags();
          break;
        case "orders":
          res = await adminAPI.getOrders();
          break;
      }
      setItems(res?.data || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      switch (activeTab) {
        case "products":
          await adminAPI.deleteProduct(id);
          break;
        case "notifications":
          await adminAPI.deleteNotification(id);
          break;
        case "tags":
          await adminAPI.deleteTag(id);
          break;
      }
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
    loadData();
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status);
    setTrackingNumber(order.trackingNumber || "");
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || orderStatus === selectedOrder.status) return;
    setStatusUpdating(true);
    try {
      await adminAPI.updateOrderStatus(selectedOrder._id, orderStatus);
      setSelectedOrder({ ...selectedOrder, status: orderStatus });
      loadData();
    } catch (err) {
      alert("Status update failed: " + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleTrackingUpdate = async () => {
    if (!selectedOrder) return;
    setTrackingUpdating(true);
    try {
      await adminAPI.updateOrderTracking(selectedOrder._id, trackingNumber);
      setSelectedOrder({ ...selectedOrder, trackingNumber });
      loadData();
    } catch (err) {
      alert("Tracking update failed: " + err.message);
    } finally {
      setTrackingUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabConfig = [
    { id: "products", label: "Products", icon: Package },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "tags", label: "Tags", icon: Tags },
    { id: "orders", label: "Orders", icon: ShoppingCart },
  ];

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q)
    );
  });

  // ▸ Show form view
  if (showForm && activeTab !== "orders") {
    return (
      <FormView
        tab={activeTab}
        item={editingItem}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Site
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabConfig.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {activeTab !== "orders" && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab.slice(0, -1)}
            </button>
          )}
        </div>

        {/* Items List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {activeTab} found
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {item.title || item.name || item.customerName || "—"}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {item.slug && (
                        <span className="text-xs text-gray-400">/{item.slug}</span>
                      )}
                      {item.price !== undefined && (
                        <span className="text-xs font-medium text-green-600">
                          ₹{typeof item.price === "object" ? item.price?.total : item.price}
                        </span>
                      )}
                      {item.status && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {item.status}
                        </span>
                      )}
                      {activeTab === "tags" && item.type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {item.type}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeTab !== "orders" && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {activeTab === "orders" && (
                    <button onClick={() => handleOrderClick(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">Order #{selectedOrder._id.slice(-8)}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Customer */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Customer</h4>
                <p className="text-sm font-medium text-gray-900">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customerEmail}</p>
                {selectedOrder.customerPhone && <p className="text-sm text-gray-500">{selectedOrder.customerPhone}</p>}
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Items</h4>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.title} × {item.quantity} <span className="text-gray-400 capitalize">({item.format})</span></span>
                      <span className="font-medium">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium capitalize">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">₹{selectedOrder.price?.total?.toLocaleString("en-IN")}</span>
              </div>

              {/* Status Update */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Update Status</h4>
                <div className="flex gap-2">
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={statusUpdating || orderStatus === selectedOrder.status}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
                  >
                    {statusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Tracking ID — only for orders with physical/POD items */}
              {(() => {
                const hasPhysical = (selectedOrder.items || []).some(
                  (i) => i.format === "physical" || i.subFormat === "print-on-demand"
                );
                if (!hasPhysical) return null;
                return (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Tracking ID
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. IND123456789"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={handleTrackingUpdate}
                        disabled={trackingUpdating || trackingNumber === (selectedOrder.trackingNumber || "")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
                      >
                        {trackingUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <p className="text-xs text-gray-400 mt-1.5">Current: {selectedOrder.trackingNumber}</p>
                    )}
                  </div>
                );
              })()}

              {/* Shipping Address */}
              {selectedOrder.shippingAddress?.address && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Shipping Address</h4>
                  <p className="text-sm text-gray-700">
                    {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} — {selectedOrder.shippingAddress.pincode}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// FORM VIEW (routes to the right form component)
// ═══════════════════════════════════════════

import dynamic from "next/dynamic";

const ProductForm = dynamic(() => import("@/components/admin/ProductForm"), { ssr: false });
const NotificationForm = dynamic(() => import("@/components/admin/NotificationForm"), { ssr: false });
const TagForm = dynamic(() => import("@/components/admin/TagForm"), { ssr: false });

function FormView({ tab, item, onClose }) {
  switch (tab) {
    case "products":
      return <ProductForm item={item} onClose={onClose} />;
    case "notifications":
      return <NotificationForm item={item} onClose={onClose} />;
    case "tags":
      return <TagForm item={item} onClose={onClose} />;
    default:
      return null;
  }
}
