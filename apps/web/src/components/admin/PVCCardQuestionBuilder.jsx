"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  X,
  GripVertical,
} from "lucide-react";
import { adminAPI } from "@/lib/api";

export default function PVCCardQuestionBuilder({ cardId, cardName, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    question: "",
    placeholder: "",
    description: "",
    type: "text",
    isRequired: true,
    minLength: 0,
    maxLength: 500,
    pattern: "",
    options: [],
    applicableVariations: [],
    sortOrder: 0,
    displayWidth: "full",
  });

  const [newOption, setNewOption] = useState("");

  // Fetch questions
  useEffect(() => {
    fetchQuestions();
  }, [cardId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.get(`/pvc-cards/${cardId}/questions`);
      setQuestions(response.data?.data || []);
    } catch (err) {
      setError("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { label: newOption, value: newOption }],
    }));
    setNewOption("");
  };

  const removeOption = (index) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm({
      question: "",
      placeholder: "",
      description: "",
      type: "text",
      isRequired: true,
      minLength: 0,
      maxLength: 500,
      pattern: "",
      options: [],
      applicableVariations: [],
      sortOrder: questions.length,
      displayWidth: "full",
    });
    setEditingQuestion(null);
    setNewOption("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let response;
      if (editingQuestion) {
        response = await adminAPI.put(`/pvc-cards/questions/${editingQuestion._id}`, form);
      } else {
        response = await adminAPI.post(`/pvc-cards/${cardId}/questions`, form);
      }

      if (response.data?.success) {
        await fetchQuestions();
        resetForm();
        setShowForm(false);
      } else {
        setError(response.data?.error || "Failed to save question");
      }
    } catch (err) {
      setError(err.message || "Error saving question");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setForm(question);
    setShowForm(true);
  };

  const handleDelete = async (questionId) => {
    if (!confirm("Delete this question?")) return;

    try {
      setSaving(true);
      const response = await adminAPI.delete(`/pvc-cards/questions/${questionId}`);
      if (response.data?.success) {
        await fetchQuestions();
      }
    } catch (err) {
      setError("Failed to delete question");
    } finally {
      setSaving(false);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{cardName} - Questions</h2>
          <p className="text-gray-600 mt-1">{questions.length} question{questions.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Question
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No questions added yet</p>
          </div>
        ) : (
          questions.map((question, index) => (
            <div
              key={question._id}
              className="flex items-start gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition"
            >
              <GripVertical className="text-gray-400 mt-1" size={18} />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{question.question}</h3>
                <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {question.type}
                  </span>
                  {question.isRequired && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                  {question.displayWidth !== "full" && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {question.displayWidth}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(question)}
                  className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(question._id)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Question Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingQuestion ? "Edit Question" : "Add Question"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <input
                  type="text"
                  name="question"
                  value={form.question}
                  onChange={handleInputChange}
                  placeholder="e.g., Enter your Aadhar Number"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                    <option value="textarea">Textarea</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width
                  </label>
                  <select
                    name="displayWidth"
                    value={form.displayWidth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full">Full</option>
                    <option value="half">Half</option>
                    <option value="third">Third</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placeholder
                </label>
                <input
                  type="text"
                  name="placeholder"
                  value={form.placeholder}
                  onChange={handleInputChange}
                  placeholder="e.g., 123456789012"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Help Text
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Helpful information for users"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Options for dropdown/checkbox */}
              {(form.type === "dropdown" || form.type === "checkbox") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2 mb-3">
                    {form.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                      >
                        <span className="flex-1">{option.label}</span>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add option"
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRequired"
                    checked={form.isRequired}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Required</span>
                </label>
              </div>

              {form.type === "text" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Length
                    </label>
                    <input
                      type="number"
                      name="minLength"
                      value={form.minLength}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Length
                    </label>
                    <input
                      type="number"
                      name="maxLength"
                      value={form.maxLength}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
