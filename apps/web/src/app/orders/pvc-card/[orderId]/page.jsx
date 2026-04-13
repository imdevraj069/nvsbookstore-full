"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import Link from "next/link";
import { format } from "date-fns";

export default function PVCCardOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await userAPI.get(`/pvc-card-orders/${orderId}`);
      setOrder(response.data?.data);
    } catch (err) {
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Order not found</p>
      </div>
    );
  }

  const statusSteps = [
    { status: "pending", label: "Pending", icon: Clock },
    { status: "paid", label: "Paid", icon: DollarSign },
    { status: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { status: "processing", label: "Processing", icon: Package },
    { status: "ready_for_dispatch", label: "Ready", icon: Package },
    { status: "dispatched", label: "Dispatched", icon: Truck },
    { status: "delivered", label: "Delivered", icon: CheckCircle2 },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.status === order.status);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <Link
        href="/orders/pvc-card"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft size={18} />
        Back to Orders
      </Link>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Order Header */}
      <div className="bg-white border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Order Number</p>
            <p className="text-xl font-bold text-gray-900">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Order Date</p>
            <p className="text-lg text-gray-900">{format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">₹{order.totalAmount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Status</p>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded inline-block ${
                statusColors[order.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>
      </div>

      {/* Order Timeline */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Order Status</h2>
        <div className="flex overflow-x-auto gap-4">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const Icon = step.icon;
            return (
              <div
                key={step.status}
                className="flex flex-col items-center min-w-max"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <Icon size={24} />
                </div>
                <p
                  className={`text-xs font-semibold text-center ${
                    isCompleted ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Order Items & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{item.cardName}</p>
                      <p className="text-sm text-gray-600">{item.variation.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">×{item.quantity}</p>
                      <p className="font-bold text-gray-900">₹{item.totalPrice}</p>
                    </div>
                  </div>

                  {/* Answers */}
                  {item.answers && item.answers.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-xs font-semibold text-gray-700 uppercase">Details Provided</p>
                      {item.answers.map((answer, ansIdx) => (
                        <div key={ansIdx} className="text-sm">
                          <p className="text-gray-600">{answer.question}</p>
                          <p className="font-medium text-gray-900 bg-gray-50 p-2 rounded mt-1">
                            {Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pricing</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax</span>
                  <span>₹{order.tax}</span>
                </div>
              )}
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span>₹{order.shippingCost}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Discount</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span>
                <span className="text-green-600">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Shipping & Tracking */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
              <MapPin size={20} />
              Shipping Address
            </h2>
            <div className="text-gray-700 space-y-1">
              <p className="font-semibold">{order.customerName}</p>
              <p>{order.shippingAddress?.street}</p>
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state}
              </p>
              <p>{order.shippingAddress?.pincode}</p>
              {order.customerPhone && <p>{order.customerPhone}</p>}
            </div>
          </div>

          {/* Tracking Info */}
          {order.status === "dispatched" && order.trackingNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900 mb-4">
                <Truck size={20} />
                Tracking
              </h2>
              <div className="space-y-3">
                {order.courierName && (
                  <div>
                    <p className="text-sm text-blue-700 font-semibold">Courier</p>
                    <p className="font-bold text-blue-900">{order.courierName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-blue-700 font-semibold">Tracking Number</p>
                  <p className="font-mono font-bold text-blue-900 text-lg break-all">
                    {order.trackingNumber}
                  </p>
                </div>
                {order.dispatchedAt && (
                  <div>
                    <p className="text-sm text-blue-700 font-semibold">Dispatched On</p>
                    <p className="text-blue-900">{format(new Date(order.dispatchedAt), "MMM dd, yyyy HH:mm")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          {order.status === "delivered" && order.deliveredAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-green-900 mb-4">
                <CheckCircle2 size={20} />
                Delivered
              </h2>
              <p className="text-green-700">
                Delivered on {format(new Date(order.deliveredAt), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Info</h2>
            <div className="text-gray-700 space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-blue-600">{order.customerEmail}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
