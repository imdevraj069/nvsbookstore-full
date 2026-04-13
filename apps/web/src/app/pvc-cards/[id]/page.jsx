"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  Plus,
  Minus,
  ShoppingCart,
  ArrowLeft,
} from "lucide-react";
import { userAPI } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function PVCCardCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const cardId = params.id;

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [answers, setAnswers] = useState({});
  const [applicableQuestions, setApplicableQuestions] = useState([]);
  const [shippingAddress, setShippingAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (cardId) fetchCard();
  }, [cardId]);

  useEffect(() => {
    if (selectedVariation && card) {
      // Filter questions applicable to this variation
      const applicable = card.questions.filter((q) => {
        if (q.applicableVariations.length === 0) return true;
        return q.applicableVariations.includes(selectedVariation.name);
      });
      setApplicableQuestions(applicable);
      setAnswers({});
    }
  }, [selectedVariation, card]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await userAPI.get(`/pvc-cards/${cardId}`);
      setCard(response.data?.data);
      if (response.data?.data?.variations?.length > 0) {
        setSelectedVariation(response.data.data.variations[0]);
      }
    } catch (err) {
      setError("Failed to load card details");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const validateAnswers = () => {
    for (const question of applicableQuestions) {
      if (question.isRequired && !answers[question._id]) {
        setError(`${question.question} is required`);
        return false;
      }
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!validateAnswers()) return;
    if (!selectedVariation) {
      setError("Please select a variation");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      // Format answers
      const formattedAnswers = applicableQuestions.map((q) => ({
        questionId: q._id,
        question: q.question,
        answer: answers[q._id],
      }));

      // Create order
      const response = await userAPI.post("/pvc-card-orders", {
        customerId: user._id,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone || "",
        shippingAddress,
        items: [
          {
            pvcCard: cardId,
            variation: {
              name: selectedVariation.name,
              price: selectedVariation.price,
            },
            quantity,
            answers: formattedAnswers,
          },
        ],
        paymentMethod: "razorpay",
      });

      if (response.data?.success) {
        // Redirect to payment
        router.push(`/checkout/pvc-card?orderId=${response.data.data._id}`);
      } else {
        setError(response.data?.error || "Failed to create order");
      }
    } catch (err) {
      setError(err.message || "Error creating order");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Card not found</p>
      </div>
    );
  }

  const totalPrice = selectedVariation ? selectedVariation.price * quantity : 0;

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <Link
        href="/pvc-cards"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft size={18} />
        Back to Cards
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Card Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Details */}
          <div className="bg-white border rounded-lg p-6">
            {card.thumbnailUrl && (
              <img
                src={card.thumbnailUrl}
                alt={card.name}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            <h1 className="text-3xl font-bold text-gray-900">{card.name}</h1>
            <p className="text-gray-600 mt-2">{card.description}</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Variation Selection */}
          {card.variations && card.variations.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Choose Option</h2>
              <div className="grid grid-cols-1 gap-3">
                {card.variations.map((variation, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedVariation(variation)}
                    className={`p-4 border-2 rounded-lg transition text-left ${
                      selectedVariation?.name === variation.name
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">{variation.name}</span>
                      <span className="text-xl font-bold text-green-600">₹{variation.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Questions Form */}
          {applicableQuestions.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Details</h2>
              <div className="space-y-4">
                {applicableQuestions.map((question) => (
                  <div key={question._id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {question.question}
                      {question.isRequired && <span className="text-red-600">*</span>}
                    </label>
                    {question.description && (
                      <p className="text-xs text-gray-500 mb-2">{question.description}</p>
                    )}

                    {question.type === "textarea" ? (
                      <textarea
                        value={answers[question._id] || ""}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                        placeholder={question.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : question.type === "dropdown" ? (
                      <select
                        value={answers[question._id] || ""}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an option</option>
                        {question.options.map((opt, idx) => (
                          <option key={idx} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : question.type === "checkbox" ? (
                      <div className="space-y-2">
                        {question.options.map((opt, idx) => (
                          <label key={idx} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              value={opt.value}
                              checked={(answers[question._id] || []).includes(opt.value)}
                              onChange={(e) => {
                                const current = answers[question._id] || [];
                                if (e.target.checked) {
                                  handleAnswerChange(question._id, [...current, opt.value]);
                                } else {
                                  handleAnswerChange(
                                    question._id,
                                    current.filter((v) => v !== opt.value)
                                  );
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={question.type}
                        value={answers[question._id] || ""}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                        placeholder={question.placeholder}
                        minLength={question.minLength}
                        maxLength={question.maxLength}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Address */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Street address"
                value={shippingAddress.street}
                onChange={(e) =>
                  setShippingAddress((prev) => ({ ...prev, street: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={shippingAddress.state}
                  onChange={(e) =>
                    setShippingAddress((prev) => ({ ...prev, state: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                placeholder="Pincode"
                value={shippingAddress.pincode}
                onChange={(e) =>
                  setShippingAddress((prev) => ({ ...prev, pincode: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 sticky top-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Order Summary</h3>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-2 border rounded-lg p-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 text-gray-600 hover:text-gray-900"
                >
                  <Minus size={18} />
                </button>
                <span className="flex-1 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1 text-gray-600 hover:text-gray-900"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Pricing */}
            {selectedVariation && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-gray-700">
                  <span>Unit Price</span>
                  <span>₹{selectedVariation.price}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Quantity</span>
                  <span>×{quantity}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-600">₹{totalPrice}</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCheckout}
              disabled={processing || !selectedVariation}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 transition"
            >
              {processing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <ShoppingCart size={20} />
              )}
              Proceed to Checkout
            </button>

            {!user && (
              <p className="text-xs text-gray-500 text-center">
                You'll be redirected to login
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
