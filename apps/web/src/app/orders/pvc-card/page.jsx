"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  Package,
  Eye,
  Search,
  Filter,
  Calendar,
  Truck,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { format } from "date-fns";

export default function PVCCardOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await userAPI.get("/pvc-card-orders/my");
      setOrders(response.data?.data || []);
    } catch (err) {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) =>
        item.cardName.toLowerCase().includes(searchTerm.toLowerCase())
      );

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
        <h1 className="text-3xl font-bold text-gray-900">My PVC Card Orders</h1>
        <p className="text-gray-600 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
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
            placeholder="Search order number or card name..."
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
            <option value="ready_for_dispatch">Ready to Ship</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm || statusFilter !== "all"
              ? "No orders found matching your filter"
              : "No PVC card orders yet"}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <Link
              href="/pvc-cards"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse PVC Cards
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Order Number */}
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">
                    Order Number
                  </p>
                  <p className="font-bold text-gray-900">{order.orderNumber}</p>
                </div>

                {/* Date */}
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Date
                  </p>
                  <p className="text-gray-900">{format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Amount</p>
                  <p className="text-lg font-bold text-green-600">₹{order.totalAmount}</p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Status</p>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
                      statusColors[order.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-4 mb-4">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Items</p>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.cardName} ({item.variation.name}) × {item.quantity}
                      </span>
                      <span className="font-semibold text-gray-900">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking */}
              {order.status === "dispatched" && order.trackingNumber && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 flex items-start gap-2">
                  <Truck size={18} className="text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900">Dispatch Info</p>
                    <p className="text-blue-800">
                      Courier: <strong>{order.courierName}</strong>
                    </p>
                    <p className="text-blue-800">
                      Tracking: <strong>{order.trackingNumber}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex justify-end">
                <Link
                  href={`/orders/pvc-card/${order._id}`}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Eye size={16} />
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
