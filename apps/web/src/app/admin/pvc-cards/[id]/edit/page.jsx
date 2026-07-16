"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import Link from "next/link";

export default function EditPVCCardPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id;
  const isNew = cardId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedVariation, setExpandedVariation] = useState(0);

  const [form, setForm] = useState({
    name: "",
    description: "",
    thumbnailUrl: "",
    thumbnailKey: "",
    isActive: true,
    displayOrder: 0,
    variations: [{ id: 1, name: "Standard Print", price: 100 }],
    questions: [],
  });

  const [newQuestion, setNewQuestion] = useState({
    question: "",
    description: "",
    type: "text",
    placeholder: "",
    isRequired: false,
    applicableVariations: [],
  });

  const [uploading, setUploading] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [serverImages, setServerImages] = useState([]);
  const [loadingServerImages, setLoadingServerImages] = useState(false);

  useEffect(() => {
    if (!isNew) fetchCard();
  }, [cardId, isNew]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPVCCard(cardId);
      const cardData = response.data?.card || response.data;
      const questionsData = response.data?.questions || [];
      if (cardData) {
        // Ensure variations are normalized
        const normalizedVariations = (cardData.variations || []).map((v, index) => ({
          ...v,
          id: v.id || index + 1,
          price: parseFloat(v.price) || 0,
        }));
        setForm({
          ...cardData,
          variations: normalizedVariations,
          questions: questionsData,
        });
      }
    } catch (err) {
      setError("Failed to load card details");
    } finally {
      setLoading(false);
    }
  };

  const loadServerImages = async () => {
    try {
      setLoadingServerImages(true);
      const response = await adminAPI.getServerImages();
      setServerImages(response.data || []);
    } catch (err) {
      console.error("Failed to load server images:", err);
    } finally {
      setLoadingServerImages(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminAPI.uploadServerImage(formData);
      if (response.success && response.data) {
        setForm((prev) => ({
          ...prev,
          thumbnailUrl: response.data.url,
          thumbnailKey: response.data.key,
        }));
      } else {
        setError(response.error || "Failed to upload image");
      }
    } catch (err) {
      setError(err.message || "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addVariation = () => {
    const newId = Math.max(...form.variations.map((v) => v.id || 0), 0) + 1;
    setForm((prev) => ({
      ...prev,
      variations: [...prev.variations, { id: newId, name: "", price: 0 }],
    }));
    setExpandedVariation(form.variations.length);
  };

  const updateVariation = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.variations];
      // Ensure price is always stored as a number
      if (field === "price") {
        updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, variations: updated };
    });
  };

  const removeVariation = (index) => {
    if (form.variations.length <= 1) {
      setError("❌ Card must have at least one variation");
      return;
    }
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
  };

  const addQuestion = () => {
    if (!newQuestion.question.trim()) {
      setError("❌ Question text is required");
      return;
    }
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...newQuestion, _id: Date.now().toString() }],
    }));
    setNewQuestion({
      question: "",
      description: "",
      type: "text",
      placeholder: "",
      isRequired: false,
      applicableVariations: [],
    });
  };

  const removeQuestion = (index) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const toggleQuestionVariation = (questionIndex, variationIndex) => {
    setForm((prev) => {
      const updated = [...prev.questions];
      const variations = updated[questionIndex].applicableVariations || [];
      updated[questionIndex].applicableVariations = variations.includes(variationIndex)
        ? variations.filter((v) => v !== variationIndex)
        : [...variations, variationIndex];
      return { ...prev, questions: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.name.trim()) {
        setError("❌ Please enter a card name");
        setSaving(false);
        return;
      }

      const invalidVariations = form.variations.filter(
        (v) => !v.name.trim() || !v.price || parseFloat(v.price) <= 0
      );
      if (invalidVariations.length > 0) {
        setError(`❌ All variations need name & price (must be > 0). ${invalidVariations.length} incomplete.`);
        setSaving(false);
        return;
      }

      // Remove client-side numeric IDs from variations (MongoDB will auto-generate _id)
      const dataToSend = {
        ...form,
        variations: form.variations.map(({ id, ...v }) => v), // Strip out the numeric 'id' field
      };

      const response = isNew
        ? await adminAPI.createPVCCard(dataToSend)
        : await adminAPI.updatePVCCard(cardId, dataToSend);

      if (response.success) {
        router.push("/admin/pvc-cards");
      } else {
        setError(`❌ ${response.error || "Failed to save"}`);
      }
    } catch (err) {
      setError(`❌ ${err.message || "Error saving"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="space-y-4 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin/pvc-cards"
            className="px-4 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-50 border border-gray-200 font-medium transition"
          >
            <ArrowLeft className="inline mr-2" size={18} />
            Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? "✨ Create Card" : "✏️ Edit Card"}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {isNew ? "Variations & Questions" : "Update card details"}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="font-bold">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-bold text-white">📋 Basic Info</h2>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Card Name (e.g., Aadhar)"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={form.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-700 mb-3">🖼️ Demo Card Image</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Image Preview */}
                  <div className="md:col-span-1 border border-gray-200 rounded-lg p-2 flex flex-col items-center justify-center bg-white h-40 relative overflow-hidden group">
                    {form.thumbnailUrl ? (
                      <>
                        <img
                          src={form.thumbnailUrl}
                          alt="Demo Card"
                          className="w-full h-full object-contain rounded transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleInputChange("thumbnailUrl", "")}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 p-4">
                        <Upload className="mx-auto mb-2 text-gray-300" size={28} />
                        <p className="text-xs">No template uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition cursor-pointer text-center text-sm border border-blue-200 flex items-center justify-center gap-2">
                        {uploading ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Upload Image
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={handleFileUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowImageSelector(true);
                          loadServerImages();
                        }}
                        className="flex-1 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium transition text-sm border border-purple-200 flex items-center justify-center gap-2"
                      >
                        <Settings size={16} />
                        Choose from Server
                      </button>
                    </div>

                    <div>
                      <input
                        type="url"
                        value={form.thumbnailUrl}
                        onChange={(e) => handleInputChange("thumbnailUrl", e.target.value)}
                        placeholder="Or paste demo image URL directly"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => handleInputChange("displayOrder", parseInt(e.target.value))}
                  placeholder="Order"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => handleInputChange("isActive", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Variations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">💰 Variations</h2>
              <button
                type="button"
                onClick={addVariation}
                className="px-3 py-1.5 text-sm bg-white text-purple-600 rounded-lg hover:bg-gray-50 font-medium"
              >
                <Plus className="inline mr-1" size={16} />
                Add
              </button>
            </div>
            <div className="p-6 space-y-3">
              {form.variations.map((v, idx) => (
                <div key={idx} className="border rounded-lg">
                  <button
                    type="button"
                    onClick={() => setExpandedVariation(expandedVariation === idx ? -1 : idx)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{v.name || `Variation ${idx + 1}`}</p>
                      <p className="text-sm text-gray-500">₹{v.price}</p>
                    </div>
                    <ChevronDown className={`transition ${expandedVariation === idx ? "rotate-180" : ""}`} size={18} />
                  </button>
                  {expandedVariation === idx && (
                    <div className="p-4 border-t space-y-3">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateVariation(idx, "name", e.target.value)}
                        placeholder="Name"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={v.price || ""}
                        onChange={(e) => updateVariation(idx, "price", e.target.value || 0)}
                        placeholder="Price (required)"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {form.variations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariation(idx)}
                          className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h2 className="text-lg font-bold text-white">❓ Questions</h2>
              <p className="text-green-100 text-sm mt-1">Asked during ordering</p>
            </div>
            <div className="p-6 space-y-4">
              {form.questions.map((q, idx) => {
                const applicableVariationNames = form.variations
                  .filter((_, vIdx) => 
                    q.applicableVariations && 
                    (q.applicableVariations.length === 0 || q.applicableVariations.includes(vIdx) || q.applicableVariations.includes(q.name))
                  )
                  .map(v => v.name);
                
                return (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{q.question}</p>
                        {q.description && <p className="text-sm text-gray-500 mt-1">{q.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {applicableVariationNames.length > 0 ? (
                            applicableVariationNames.map((name, i) => (
                              <span key={i} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500 italic">Applies to all variations</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeQuestion(idx)} className="text-red-600 flex-shrink-0">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {form.variations.length > 1 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">Applies to:</p>
                        <div className="flex flex-wrap gap-2">
                          {form.variations.map((v, vIdx) => (
                            <label key={vIdx} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!q.applicableVariations || q.applicableVariations.length === 0 || q.applicableVariations.includes(vIdx)}
                                onChange={() => toggleQuestionVariation(idx, vIdx)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700">{v.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-t pt-4 space-y-3">
                <input
                  type="text"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="Question"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newQuestion.description}
                  onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                  placeholder="Help text  (optional)"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                  <input
                    type="text"
                    value={newQuestion.placeholder}
                    onChange={(e) => setNewQuestion({ ...newQuestion, placeholder: e.target.value })}
                    placeholder="Placeholder"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newQuestion.isRequired}
                    onChange={(e) => setNewQuestion({ ...newQuestion, isRequired: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Required</span>
                </label>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Plus className="inline mr-2" size={18} />
                  Add Question
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex gap-3 justify-end sticky bottom-0">
            <Link href="/admin/pvc-cards" className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Card
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Server Image Selector Modal */}
      {showImageSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Select Card Design Template</h3>
                <p className="text-sm text-gray-500 mt-1">Choose from images uploaded on the server</p>
              </div>
              <button
                onClick={() => setShowImageSelector(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
              {loadingServerImages ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="animate-spin text-blue-600" size={40} />
                  <p className="text-gray-500 text-sm">Loading images...</p>
                </div>
              ) : serverImages.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-lg">
                  <p className="text-gray-500 text-lg">No images available on the server</p>
                  <p className="text-gray-400 text-sm mt-1">Upload a design file to start</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {serverImages.map((img) => (
                    <button
                      key={img.key}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          thumbnailUrl: img.url,
                          thumbnailKey: img.key,
                        }));
                        setShowImageSelector(false);
                      }}
                      className="group flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 hover:shadow-md transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="h-28 bg-gray-100 border-b border-gray-100 overflow-hidden relative">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-700 truncate" title={img.name}>
                          {img.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {(img.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowImageSelector(false)}
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
