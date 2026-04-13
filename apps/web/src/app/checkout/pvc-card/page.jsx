"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { userAPI } from "@/lib/api";
import Script from "next/script";

function PVCCardCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState(null);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getPVCCardOrderDetails(orderId);
      setOrder(response.data);
    } catch (err) {
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order) return;

    try {
      setProcessing(true);
      setError("");

      // Create Razorpay order
      const response = await userAPI.initiateRazorpayPayment({
        amount: order.totalAmount * 100, // Convert to paise
        orderId: order._id,
        orderType: "pvc_card",
      });

      if (!response.success) {
        setError("Failed to initiate payment");
        setProcessing(false);
        return;
      }

      const rzpOrderId = response.data.id;
      setRazorpayOrderId(rzpOrderId);

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.totalAmount * 100,
        currency: "INR",
        name: "NVS BookStore",
        description: `PVC Card Order - ${order.orderNumber}`,
        order_id: rzpOrderId,
        image: "https://nvsbookstore.in/logo.png",
        prefill: {
          name: order.customerName,
          email: order.customerEmail,
          contact: order.customerPhone,
        },
        handler: handlePaymentSuccess,
        modal: {
          ondismiss: handlePaymentCancel,
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.message || "Payment initialization failed");
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response) => {
    try {
      setProcessing(true);

      // Verify payment on backend
      const verifyResponse = await userAPI.verifyRazorpayPayment({
        orderId: order._id,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        orderType: "pvc_card",
      });

      if (verifyResponse.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          router.push(`/orders/pvc-card/${orderId}`);
        }, 3000);
      } else {
        setError("Payment verification failed");
      }
    } catch (err) {
      setError("Payment verification error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentCancel = () => {
    setError("Payment cancelled");
    setProcessing(false);
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

  if (paymentSuccess) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-green-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-2">
          Your PVC card order has been confirmed
        </p>
        <p className="text-gray-600 mb-6">
          Order Number: <strong>{order.orderNumber}</strong>
        </p>
        <p className="text-gray-500 text-sm">
          Redirecting to order details...
        </p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Order Summary */}
          <div className="lg:col-span-2">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-6">
                <AlertCircle size={20} />
                <div>
                  <p className="font-semibold">Payment Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-white border rounded-lg p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-semibold text-gray-900">{order.customerName}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Items</h2>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-gray-700">
                      <span>
                        {item.cardName} - {item.variation.name} (×{item.quantity})
                      </span>
                      <span className="font-semibold">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h2>
                <div className="text-gray-700 space-y-1 text-sm">
                  <p>{order.shippingAddress?.street}</p>
                  <p>
                    {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                    {order.shippingAddress?.pincode}
                  </p>
                  <p>{order.shippingAddress?.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-lg p-6 sticky top-6 space-y-6">
              {/* Total */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span>₹{order.tax}</span>
                    </div>
                  )}
                  {order.shippingCost > 0 && (
                    <div className="flex justify-between text-gray-600">
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
                  <div className="border-t pt-2 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-green-600">₹{order.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  "Pay with Razorpay"
                )}
              </button>

              {/* Security Info */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔒 Secure payment powered by Razorpay
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PVCCardCheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
      <PVCCardCheckoutContent />
    </Suspense>
  );
}
