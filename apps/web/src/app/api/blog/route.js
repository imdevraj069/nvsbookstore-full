// Blog CRUD API Routes
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connection } from '@/lib/db';
import Blog from '../../../../../packages/database/src/models/Blog';
import BlogAccess from '../../../../../packages/database/src/models/BlogAccess';

// GET - List all published blogs with pagination
export async function GET(req) {
  try {
    await connection();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');

    const query = { isPublished: true };
    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const blogs = await Blog.find(query)
      .populate('author', 'name email _id')
      .select('-content') // Don't load full content in list
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: blogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
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

// POST - Create new blog (auth required)
export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connection();

    // Check if user has blog writing access
    const blogAccess = await BlogAccess.findOne({
      userId: session.user.id,
      status: 'accepted',
      canWrite: true,
    });

    if (!blogAccess && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to create blogs' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug,
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

    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const blog = new Blog({
      title,
      slug,
      author: session.user.id,
      authorName: authorName || session.user.name,
      coverImage,
      headerImage,
      content,
      tags: tags || [],
      category,
      metaTitle,
      metaDescription,
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
    });

    await blog.save();

    return NextResponse.json(
      { success: true, data: blog },
      { status: 201 }
    );
  } catch (error) {
    console.error('Blog POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
