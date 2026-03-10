'use client';

import { useState } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { feedbackAPI } from '@/lib/api';

const FeedbackForm = ({ orderId, onSubmitted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    feedbackType: 'product',
    overallSatisfaction: 4,
    productQuality: 4,
    deliverySpeed: 4,
    customerService: 4,
    whatWentWell: '',
    whatCouldImprove: '',
    suggestions: '',
    wouldRecommend: true,
    likelyToRepurchase: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await feedbackAPI.submit({
        orderId,
        ...formData,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const RatingScale = ({ label, name, value }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <label key={num} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={num}
              checked={value === num}
              onChange={handleInputChange}
              className="sr-only"
            />
            <span
              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                value === num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {num}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg text-center">
        <h3 className="font-semibold mb-2">Thank you for your feedback!</h3>
        <p>Your response helps us improve our service.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare size={24} />
        <h2 className="text-2xl font-bold">Share Your Feedback</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex gap-2">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            What is your feedback about? *
          </label>
          <select
            name="feedbackType"
            value={formData.feedbackType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="product">Product Quality</option>
            <option value="delivery">Delivery Experience</option>
            <option value="service">Customer Service</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Overall Satisfaction */}
        <RatingScale
          label="Overall Satisfaction (1=Very Dissatisfied, 5=Very Satisfied) *"
          name="overallSatisfaction"
          value={formData.overallSatisfaction}
        />

        {/* Detailed Ratings */}
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Please rate the following:</h3>

          <RatingScale
            label="Product Quality"
            name="productQuality"
            value={formData.productQuality}
          />

          <RatingScale
            label="Delivery Speed"
            name="deliverySpeed"
            value={formData.deliverySpeed}
          />

          <RatingScale
            label="Customer Service"
            name="customerService"
            value={formData.customerService}
          />
        </div>

        {/* Open Text Feedback */}
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Tell us more:</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              What went well?
            </label>
            <textarea
              name="whatWentWell"
              value={formData.whatWentWell}
              onChange={handleInputChange}
              placeholder="Share what you liked about your experience..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              What could be improved?
            </label>
            <textarea
              name="whatCouldImprove"
              value={formData.whatCouldImprove}
              onChange={handleInputChange}
              placeholder="Let us know areas for improvement..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Any additional suggestions?
            </label>
            <textarea
              name="suggestions"
              value={formData.suggestions}
              onChange={handleInputChange}
              placeholder="Share any ideas or suggestions..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Recommendation Questions */}
        <div className="border-t pt-6 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="wouldRecommend"
              checked={formData.wouldRecommend}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="font-medium">
              Would you recommend us to friends and family?
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="likelyToRepurchase"
              checked={formData.likelyToRepurchase}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="font-medium">
              Would you purchase from us again?
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
