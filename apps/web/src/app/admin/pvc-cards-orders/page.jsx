"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  Eye,
  Edit2,
  Truck,
  Search,
  Filter,
  Calendar,
  Package,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import { format } from "date-fns";

export default function PVCOrdersAdminPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "",
    courierName: "",
    trackingNumber: "",
    notes: "",
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewOrder = async (orderId) => {
    try {
      setLoadingDetail(true);
      setShowDetailModal(true);
      const res = await adminAPI.get(`/pvc-card-orders/${orderId}`);
      setViewingOrder(res.data?.data || res.data);
    } catch (err) {
      console.error("Failed to load order details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.get("/pvc-card-orders");
      setOrders(response.data?.data || []);
    } catch (err) {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setUpdateForm({
      status: order.status,
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
    });
    setShowUpdateForm(true);
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setUpdating(true);
      const response = await adminAPI.put(
        `/pvc-card-orders/${selectedOrder._id}`,
        updateForm
      );
      if (response.data?.success) {
        await fetchOrders();
        setShowUpdateForm(false);
        setSelectedOrder(null);
      }
    } catch (err) {
      setError("Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-blue-100 text-blue-700",
    confirmed: "bg-indigo-100 text-indigo-700",
    processing: "bg-purple-100 text-purple-700",
    ready_for_dispatch: "bg-orange-100 text-orange-700",
    dispatched: "bg-cyan-100 text-cyan-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-700",
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PVC Card Orders</h1>
        <p className="text-gray-600 mt-1">{orders.length} total order{orders.length !== 1 ? "s" : ""}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search order number, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready_for_dispatch">Ready for Dispatch</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Order</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order._id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order._id.slice(-8)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-500">{order.customerEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-700">
                          {item.cardName} {item.variation.name && `(${item.variation.name})`}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-semibold text-gray-900">₹{order.totalAmount}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar size={14} />
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewOrder(order._id)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs inline-flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded border border-indigo-200"
                      >
                        <Eye size={13} />
                        Details
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded border border-blue-200"
                      >
                        <Edit2 size={13} />
                        Update
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Update Order Modal */}
      {showUpdateForm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Update Order Status</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedOrder.orderNumber}</p>
            </div>

            <form onSubmit={handleUpdateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={updateForm.status}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {updateForm.status === "dispatched" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Courier Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., DHL, FedEx, Local"
                      value={updateForm.courierName}
                      onChange={(e) =>
                        setUpdateForm((prev) => ({
                          ...prev,
                          courierName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="Tracking number"
                      value={updateForm.trackingNumber}
                      onChange={(e) =>
                        setUpdateForm((prev) => ({
                          ...prev,
                          trackingNumber: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Add any notes about this order"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateForm(false);
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {updating ? <Loader2 className="animate-spin" size={18} /> : <Truck size={18} />}
                  Update Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                <p className="text-sm text-gray-500">{viewingOrder?.orderNumber || "Loading..."}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setViewingOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : viewingOrder ? (
                <>
                  {/* Customer & Shipping */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">👤 Customer</h4>
                      <p className="font-semibold text-gray-900">{viewingOrder.customerName}</p>
                      <p className="text-sm text-gray-600">{viewingOrder.customerEmail}</p>
                      {viewingOrder.customerPhone && <p className="text-sm text-gray-600">📞 {viewingOrder.customerPhone}</p>}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">📍 Shipping Address</h4>
                      <p className="text-sm text-gray-800">{viewingOrder.shippingAddress?.street}</p>
                      <p className="text-sm text-gray-800">
                        {viewingOrder.shippingAddress?.city}, {viewingOrder.shippingAddress?.state} - {viewingOrder.shippingAddress?.pincode}
                      </p>
                      <p className="text-sm text-gray-500">{viewingOrder.shippingAddress?.country || 'India'}</p>
                    </div>
                  </div>

                  {/* Items & Answers */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b pb-2">📦 Items & Customer Questionnaire Answers</h4>
                    {viewingOrder.items?.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-white">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <div>
                            <span className="font-bold text-gray-900 text-base">{item.cardName || item.pvcCard?.name}</span>
                            <span className="ml-2 text-sm text-blue-600 font-medium">({item.variation?.name})</span>
                          </div>
                          <span className="font-bold text-green-600 text-base">₹{item.totalPrice || (item.variation?.price * item.quantity)}</span>
                        </div>

                        {/* Answers */}
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-bold text-gray-400 uppercase">Question Answers:</p>
                          {item.answers && item.answers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                              {item.answers.map((ans, aIdx) => {
                                const isFileUrl = typeof ans.answer === 'string' && (ans.answer.startsWith('/files/serve') || ans.answer.startsWith('http://') || ans.answer.startsWith('https://'));
                                return (
                                  <div key={aIdx} className="p-3 bg-gray-50 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-semibold text-gray-600">{ans.question}</p>
                                      {!isFileUrl && (
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                                          {Array.isArray(ans.answer) ? ans.answer.join(', ') : (ans.answer || '—')}
                                        </p>
                                      )}
                                    </div>

                                    {isFileUrl && (
                                      <div className="flex items-center gap-3">
                                        <a
                                          href={ans.answer}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1 shadow-sm"
                                        >
                                          <Eye size={14} /> View File
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No answers recorded</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setViewingOrder(null);
                }}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
