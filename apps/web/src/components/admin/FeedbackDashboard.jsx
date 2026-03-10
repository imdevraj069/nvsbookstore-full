'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2, Filter } from 'lucide-react';
import { adminAPI } from '@/lib/api';

const FeedbackDashboard = () => {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const user = (() => {
    try {
      if (!token) return null;
      return JSON.parse(atob(token.split('.')[1]));
    } catch { return null; }
  })();

  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, product, delivery, service
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      let params = 'limit=50';

      if (filter === 'unread') {
        params += '&isRead=false';
      } else if (filter !== 'all') {
        params += `&feedbackType=${filter}`;
      }

      const data = await adminAPI.getFeedback(params);
      setFeedback(data.data || []);

      // Calculate stats
      const allFeedback = data.data || [];
      setStats({
        total: allFeedback.length,
        unread: allFeedback.filter((f) => !f.isRead).length,
        product: allFeedback.filter((f) => f.feedbackType === 'product').length,
        delivery: allFeedback.filter((f) => f.feedbackType === 'delivery').length,
        service: allFeedback.filter((f) => f.feedbackType === 'service').length,
      });
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    try {
      const result = await adminAPI.updateFeedback(id, { isRead: !isRead });
      if (!result.success) throw new Error('Failed to update');
      await fetchFeedback();
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await adminAPI.deleteFeedback(id);
      if (!result.success) throw new Error('Failed to delete');
      setFeedback(feedback.filter((f) => f._id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting feedback:', error);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredFeedback = feedback;

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Customer Feedback Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">Total Feedback</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">Unread</p>
          <p className="text-3xl font-bold text-red-600">{stats.unread}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">Product Quality</p>
          <p className="text-3xl font-bold text-blue-600">{stats.product}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">Delivery</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.delivery}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">Service</p>
          <p className="text-3xl font-bold text-purple-600">{stats.service}</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'unread', 'product', 'delivery', 'service'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Filter size={16} className="inline mr-2" />
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No feedback found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item) => (
            <div
              key={item._id}
              className={`border rounded-lg p-6 transition-colors ${
                !item.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {item.customerName}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.feedbackType === 'product'
                          ? 'bg-blue-100 text-blue-700'
                          : item.feedbackType === 'delivery'
                            ? 'bg-yellow-100 text-yellow-700'
                            : item.feedbackType === 'service'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.feedbackType.charAt(0).toUpperCase() +
                        item.feedbackType.slice(1)}
                    </span>
                    {!item.isRead && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        UNREAD
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {item.customerEmail}
                  </p>

                  {/* Ratings Display */}
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Overall Satisfaction</p>
                      <p className={`text-2xl font-bold ${getRatingColor(item.overallSatisfaction)}`}>
                        {item.overallSatisfaction}/5
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Product Quality</p>
                      <p className={`text-2xl font-bold ${getRatingColor(item.productQuality)}`}>
                        {item.productQuality}/5
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Delivery Speed</p>
                      <p className={`text-2xl font-bold ${getRatingColor(item.deliverySpeed)}`}>
                        {item.deliverySpeed}/5
                      </p>
                    </div>
                  </div>

                  {/* Text Feedback */}
                  {item.whatWentWell && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs font-semibold text-green-700 mb-1">
                        What went well:
                      </p>
                      <p className="text-sm text-gray-700">{item.whatWentWell}</p>
                    </div>
                  )}

                  {item.whatCouldImprove && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-semibold text-yellow-700 mb-1">
                        Could be improved:
                      </p>
                      <p className="text-sm text-gray-700">
                        {item.whatCouldImprove}
                      </p>
                    </div>
                  )}

                  {item.suggestions && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-semibold text-blue-700 mb-1">
                        Suggestions:
                      </p>
                      <p className="text-sm text-gray-700">{item.suggestions}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="flex gap-4 text-sm mt-3">
                    {item.wouldRecommend && (
                      <span className="text-green-700 font-medium">
                        ✓ Would Recommend
                      </span>
                    )}
                    {item.likelyToRepurchase && (
                      <span className="text-green-700 font-medium">
                        ✓ Likely to Repurchase
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAsRead(item._id, item.isRead)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                  >
                    {item.isRead ? (
                      <Eye size={20} />
                    ) : (
                      <EyeOff size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === item._id && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                  <p className="text-red-700 font-medium">
                    Delete this feedback?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
                <p>
                  Submitted:{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.isRead && (
                  <p>
                    Read:{' '}
                    {new Date(item.readAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackDashboard;
