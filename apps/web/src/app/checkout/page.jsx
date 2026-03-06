"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ordersAPI } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ShoppingBag, CreditCard, Truck, Loader2, CheckCircle2,
  ArrowLeft, MapPin, Phone, Mail, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, loadCart } = useCart();

  const [step, setStep] = useState(1); // 1: address, 2: payment, 3: success
  const [processing, setProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Pre-fill user info
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customerName: user.name || "",
        customerEmail: user.email || "",
      }));
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const items = cart?.items || [];

  // Helper to get correct price based on format
  const getItemPrice = (item) => {
    if (item.subFormat === "print-on-demand") return item.product?.printPrice || 0;
    if (item.format === "digital") return item.product?.digitalPrice || 0;
    return item.product?.price || 0;
  };

  const subtotal = items.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0);
  const hasPhysical = items.some((i) => i.format === "physical" || i.subFormat === "print-on-demand");
  const shipping = hasPhysical ? 60 : 0;
  const total = subtotal + shipping;

  // Validate form
  const isFormValid = () => {
    if (!form.customerName || !form.customerEmail) return false;
    if (hasPhysical && (!form.address || !form.city || !form.state || !form.pincode)) return false;
    return true;
  };

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    try {
      // 1. Create Razorpay order on server
      const rzpRes = await ordersAPI.createRazorpayOrder({ amount: Math.round(total * 100) });
      const rzpOrder = rzpRes.data;

      // 2. Open Razorpay Checkout modal
      const options = {
        key: RAZORPAY_KEY,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "NVS BookStore",
        description: `Order — ${items.length} item(s)`,
        order_id: rzpOrder.orderId,
        handler: async (response) => {
          // 3. Create order on backend with payment verification
          try {
            const orderRes = await ordersAPI.create({
              customerName: form.customerName,
              customerEmail: form.customerEmail,
              customerPhone: form.customerPhone,
              shippingAddress: hasPhysical
                ? { address: form.address, city: form.city, state: form.state, pincode: form.pincode }
                : {},
              items: items.map((i) => ({
                product: i.product._id,
                quantity: i.quantity,
                format: i.format,
                subFormat: i.subFormat || null,
              })),
              paymentMethod: "razorpay",
              price: { subtotal, discount: 0, shipping, total },
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setCreatedOrder(orderRes.data);
            setStep(3);
            loadCart(); // refresh cart (should be empty now)
          } catch (err) {
            alert("Order creation failed: " + (err.message || "Unknown error"));
          }
        },
        prefill: {
          name: form.customerName,
          email: form.customerEmail,
          contact: form.customerPhone,
        },
        theme: { color: "#1e40af" },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        alert("Payment failed: " + resp.error.description);
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      alert("Failed to initiate payment: " + (err.message || "Unknown error"));
      setProcessing(false);
    }
  };

  const handlePlaceOrder = () => {
    handleRazorpayPayment();
  };

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (items.length === 0 && step !== 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Add some books before checking out!</p>
          <button onClick={() => router.push("/")} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Browse Books
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Payment" },
            { num: 3, label: "Confirmation" },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s.num
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-sm font-medium hidden sm:inline ${step >= s.num ? "text-blue-600" : "text-gray-400"}`}>
                {s.label}
              </span>
              {idx < 2 && <div className={`w-12 h-0.5 ${step > s.num ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Form / Confirmation */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* Step 1: Address */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" /> Your Details
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {hasPhysical && (
                    <>
                      <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" /> Shipping Address
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="House no., street, area" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                          <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                          <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                          <input type="text" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" maxLength={6} />
                        </div>
                      </div>
                    </>
                  )}

                  <button onClick={() => setStep(2)} disabled={!isFormValid()} className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25">
                    Continue to Payment →
                  </button>
                </motion.div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to details
                  </button>

                  <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" /> Payment
                  </h2>

                  <div className="mb-6 p-4 rounded-xl border-2 border-blue-600 bg-blue-50/50">
                    <p className="font-semibold text-gray-900">Pay Online (Razorpay)</p>
                    <p className="text-xs text-gray-500">UPI, Cards, Net Banking, Wallets</p>
                  </div>

                  <button onClick={handlePlaceOrder} disabled={processing} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>Place Order — ₹{total.toLocaleString("en-IN")}</>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
                  <p className="text-gray-500 mb-2">Your payment was successful.</p>
                  {createdOrder && (
                    <p className="text-sm text-gray-400 mb-6">
                      Order ID: <span className="font-mono">{createdOrder._id}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mb-8">
                    A confirmation email with your invoice will be sent to <strong>{form.customerEmail}</strong>
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => router.push("/dashboard")} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                      View Orders
                    </button>
                    <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                      Continue Shopping
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Order Summary */}
          {step !== 3 && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
                <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" /> Order Summary
                </h3>

                <div className="space-y-3 max-h-72 overflow-y-auto mb-4">
                  {items.map((item) => (
                    <div key={item._id} className="flex items-start gap-3">
                      {item.product?.images?.[0] && (
                        <img src={`/files/serve?key=${item.product.images[0]}`} alt="" className="w-12 h-16 object-cover rounded-lg border border-gray-100" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product?.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{item.format}{item.subFormat ? ` · ${item.subFormat}` : ''} × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">₹{(getItemPrice(item) * item.quantity).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {hasPhysical && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Shipping</span>
                      <span className="font-medium">₹{shipping}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-blue-600">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
