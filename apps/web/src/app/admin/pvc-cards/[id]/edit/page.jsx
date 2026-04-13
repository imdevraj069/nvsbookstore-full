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

  useEffect(() => {
    if (!isNew) fetchCard();
  }, [cardId, isNew]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPVCCards();
      const card = response.data.find((c) => c._id === cardId);
      if (card) {
        // Ensure prices are parsed as numbers
        const normalizedVariations = card.variations.map((v) => ({
          ...v,
          price: parseFloat(v.price) || 0,
        }));
        setForm({ ...card, variations: normalizedVariations });
      }
    } catch (err) {
      setError("Failed to load card");
    } finally {
      setLoading(false);
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
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => handleInputChange("thumbnailUrl", e.target.value)}
                placeholder="Image URL"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
    </div>
  );
}
