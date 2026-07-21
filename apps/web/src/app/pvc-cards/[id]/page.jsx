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
  Upload,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { userAPI, adminAPI } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PVCCardCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const cardId = params.id;

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [answers, setAnswers] = useState({});
  const [applicableQuestions, setApplicableQuestions] = useState([]);
  const [uploadingQuestionId, setUploadingQuestionId] = useState(null);
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
    if (card && card.variations?.length > 0) {
      const selectedVar = card.variations[selectedVariationIdx];
      const selectedVarId = selectedVar?.id !== undefined ? String(selectedVar.id) : "";
      const selectedVarName = selectedVar?.name || "";

      // Filter questions applicable to this variation
      const applicable = (card.questions || []).filter((q) => {
        // If no variations specified, applies to all
        if (!q.applicableVariations || q.applicableVariations.length === 0) return true;
        
        const appList = q.applicableVariations.map(String);
        return (
          appList.includes(String(selectedVariationIdx)) ||
          (selectedVarId && appList.includes(selectedVarId)) ||
          (selectedVarName && appList.includes(selectedVarName))
        );
      });
      setApplicableQuestions(applicable);
      setAnswers({});
    }
  }, [selectedVariationIdx, card]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getPVCCardDetails(cardId);
      setCard(response.data);
      // Initialize with first variation
      setSelectedVariationIdx(0);
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

  const handleQuestionFileUpload = async (questionId, file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("❌ File too large (max 50MB)");
      return;
    }
    try {
      setUploadingQuestionId(questionId);
      setError("");
      const formData = new FormData();
      formData.append("image", file);
      const response = await adminAPI.uploadServerImage(formData);
      if (response.success && response.data) {
        const fileUrl = response.data.path || response.data.url;
        handleAnswerChange(questionId, fileUrl);
      } else {
        setError(response.error || "Failed to upload file");
      }
    } catch (err) {
      setError(err.message || "Error uploading file");
    } finally {
      setUploadingQuestionId(null);
    }
  };

  const validateAnswers = () => {
    for (const question of applicableQuestions) {
      const val = answers[question._id];
      const isAnswered = Array.isArray(val) ? val.length > 0 : (val !== undefined && val !== null && String(val).trim() !== "");
      if (question.isRequired && !isAnswered) {
        setError(`❌ Please answer required question: "${question.question}"`);
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
    if (!card?.variations?.[selectedVariationIdx]) {
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

      const selectedVariation = card.variations[selectedVariationIdx];
      const payload = {
        cardId: card._id,
        variation: {
          name: selectedVariation.name,
          price: selectedVariation.price,
        },
        quantity,
        answers: formattedAnswers,
        shippingAddress,
      };

      const response = await userAPI.createPVCCardOrder(payload);

      if (response.success) {
        const orderData = response.data;
        const query = new URLSearchParams({
          orderId: orderData._id || orderData.id,
          orderNumber: orderData.orderNumber,
          totalPrice: orderData.totalPrice,
          itemName: `${card.name} (${selectedVariation.name})`,
          isPvcOrder: "true",
        }).toString();
        router.push(`/payment?${query}`);
      } else {
        setError(response.error || "Failed to create order");
      }
    } catch (err) {
      setError(err.message || "Error creating order");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 text-center py-20">
          <p className="text-red-600 font-bold">PVC Card not found</p>
          <Link href="/pvc-cards" className="text-blue-600 underline text-sm mt-2 inline-block">
            Back to Catalog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const selectedVariation = card?.variations?.[selectedVariationIdx];
  const totalPrice = selectedVariation ? selectedVariation.price * quantity : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Link
          href="/pvc-cards"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition"
        >
          <ArrowLeft size={16} />
          Back to PVC Cards Catalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Demo Card & Questions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Hero Banner (3:4 ID Card Frame Display) */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* 3:4 ID Card Frame */}
                <div className="sm:col-span-1">
                  {card.thumbnailUrl ? (
                    <div className="w-full max-w-[220px] mx-auto aspect-[3/4] rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-900/5 p-2 flex items-center justify-center relative group">
                      <img
                        src={card.thumbnailUrl}
                        alt={card.name}
                        className="w-full h-full object-contain rounded-xl drop-shadow-md group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                        3:4 PVC Format
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-[220px] mx-auto aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                      Standard PVC Card
                    </div>
                  )}
                </div>

                {/* Card Title & Desc */}
                <div className="sm:col-span-2 space-y-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                    Official PVC Smart Card
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{card.name}</h1>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
                </div>
              </div>
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
                    onClick={() => setSelectedVariationIdx(index)}
                    className={`p-4 border-2 rounded-lg transition text-left ${
                      selectedVariationIdx === index
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
                    ) : question.type === "file" ? (
                      <div className="space-y-2">
                        {answers[question._id] ? (
                          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                              <a
                                href={answers[question._id]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-700 underline truncate hover:text-blue-800"
                              >
                                {answers[question._id].split("/").pop()}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAnswerChange(question._id, "")}
                              className="p-1 text-red-500 hover:text-red-700 rounded transition"
                              title="Remove file"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 bg-gray-50 hover:bg-blue-50/50 cursor-pointer transition">
                            {uploadingQuestionId === question._id ? (
                              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                                <Loader2 className="animate-spin" size={18} />
                                Uploading file...
                              </div>
                            ) : (
                              <div className="flex flex-col items-center text-gray-500 space-y-1">
                                <Upload size={24} className="text-gray-400" />
                                <span className="text-sm font-medium text-blue-600">Click to upload document/photo</span>
                                <span className="text-xs text-gray-400 font-normal">JPG, PNG, WebP or PDF (max 50MB)</span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              disabled={uploadingQuestionId === question._id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleQuestionFileUpload(question._id, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
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
      </main>
      <Footer />
    </div>
  );
}
