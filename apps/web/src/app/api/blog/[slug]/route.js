// Individual Blog Read/Update/Delete
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connection } from '@/lib/db';
import Blog from '@sarkari/database/src/models/Blog';
import BlogAccess from '@sarkari/database/src/models/BlogAccess';

// GET - Read single blog by slug
export async function GET(req, { params }) {
  try {
    await connection();

    const { slug } = params;

    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug }],
    })
      .populate('author', 'name email _id');

    if (!blog) {
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Check if user has access to draft blogs
    const session = await getServerSession();
    if (!blog.isPublished) {
      if (!session || (blog.author._id !== session?.user?.id && session?.user?.role !== 'admin')) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to view this blog' },
          { status: 403 }
        );
      }
    }

    // Increment views
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    return NextResponse.json(
      { success: true, data: blog },
      { status: 200 }
    );
  } catch (error) {
    console.error('Blog GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update blog (auth required)
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connection();

    const { slug } = params;
    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug }],
    });

    if (!blog) {
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (blog.author.toString() !== session?.user?.id && session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this blog' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug: newSlug,
      authorName,
      coverImage,
      headerImage,
      content,
      tags,
      category,
      metaTitle,
      metaDescription,
      isPublished,
    } = body;

    // Update fields
    if (title) blog.title = title;
    if (newSlug) blog.slug = newSlug;
    if (authorName) blog.authorName = authorName;
    if (coverImage) blog.coverImage = coverImage;
    if (headerImage) blog.headerImage = headerImage;
    if (content) blog.content = content;
    if (tags) blog.tags = tags;
    if (category) blog.category = category;
    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription) blog.metaDescription = metaDescription;

    // Handle publish status change
    if (isPublished !== undefined && isPublished !== blog.isPublished) {
      blog.isPublished = isPublished;
      if (isPublished) {
        blog.publishedAt = new Date();
      }
    }

    await blog.save();

    return NextResponse.json(
      { success: true, data: blog },
      { status: 200 }
    );
  } catch (error) {
    console.error('Blog PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog (auth required)
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connection();

    const { slug } = params;
    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug }],
    });

    if (!blog) {
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Check authorization - only author and admin can delete
    if (blog.author.toString() !== session?.user?.id && session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this blog' },
        { status: 403 }
      );
    }

    await Blog.deleteOne({ _id: blog._id });

    return NextResponse.json(
      { success: true, message: 'Blog deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Blog DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
