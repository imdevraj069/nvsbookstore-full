'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import BlogEditor from '@/components/blog/BlogEditor';
import { blogsAPI } from '@/lib/api';

export default function EditBlogPage() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const data = await blogsAPI.getForEdit(slug);
        if (data.success) {
          setBlog(data.data);
        } else {
          setError(data.error || 'Blog not found');
        }
      } catch (err) {
        setError(err.message || 'Error loading blog');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchBlog();
  }, [slug]);

  if (loading) {
    return <div className="text-center py-8">Loading blog...</div>;
  }

  if (error || !blog) {
    return <div className="text-center py-8">{error || 'Blog not found'}</div>;
  }

  return <BlogEditor initialBlog={blog} />;
}
