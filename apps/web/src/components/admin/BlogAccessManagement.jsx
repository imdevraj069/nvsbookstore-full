'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserPlus, Check, X, Trash2 } from 'lucide-react';

const BlogAccessManagement = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [accesses, setAccesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, invited, accepted, rejected
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchData();
  }, [status, session?.user?.role]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch blog accesses
      const accessRes = await fetch('/api/blog-access');
      const accessData = await accessRes.json();
      setAccesses(accessData.data || []);

      // Fetch all users (need to create this endpoint)
      // For now, we'll use a placeholder
      setUsers([]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setInviteLoading(true);
    setError('');

    try {
      const response = await fetch('/api/blog-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          canWrite: true,
          canPublish: false,
          canEditOwn: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invite user');
      }

      setSelectedUser('');
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateAccess = async (id, status) => {
    try {
      const response = await fetch(`/api/blog-access/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update');

      await fetchData();
    } catch (error) {
      console.error('Error updating access:', error);
      setError(error.message);
    }
  };

  const handleRevokeAccess = async (id) => {
    try {
      const response = await fetch(`/api/blog-access/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke');

      setDeleteConfirm(null);
      await fetchData();
    } catch (error) {
      console.error('Error revoking access:', error);
      setError(error.message);
    }
  };

  const filteredAccesses = accesses.filter((access) => {
    if (filter === 'all') return true;
    return access.status === filter;
  });

  if (status === 'loading' || loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Blog Access Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Invite User Section */}
      <div className="bg-white border rounded-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={24} />
          <h2 className="text-2xl font-semibold">Invite Blog Writer</h2>
        </div>

        <form onSubmit={handleInviteUser} className="flex gap-4">
          <input
            type="text"
            placeholder="Enter user email to invite"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={inviteLoading || !selectedUser}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {inviteLoading ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        {['all', 'invited', 'accepted', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({
              accesses.filter((a) => !f || a.status === f).length
            })
          </button>
        ))}
      </div>

      {/* Access List */}
      {filteredAccesses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No invitations in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccesses.map((access) => (
            <div
              key={access._id}
              className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {access.userId?.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{access.userId?.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    access.status === 'accepted'
                      ? 'bg-green-100 text-green-700'
                      : access.status === 'invited'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {access.status.charAt(0).toUpperCase() + access.status.slice(1)}
                </span>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                <p>Invited by: {access.invitedBy?.name}</p>
                <p>
                  Invited at:{' '}
                  {new Date(access.invitedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={access.canWrite}
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="ml-2">Can Write</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={access.canPublish}
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="ml-2">Can Publish</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={access.canEditOwn}
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="ml-2">Can Edit Own Posts</span>
                </label>
              </div>

              {access.status === 'invited' && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleUpdateAccess(access._id, 'accepted')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button
                    onClick={() => handleUpdateAccess(access._id, 'rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              )}

              {/* Delete/Revoke Button */}
              {deleteConfirm === access._id ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                  <p className="text-red-700 font-medium">
                    Revoke access?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRevokeAccess(access._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Revoke
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(access._id)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Revoke Access
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogAccessManagement;
