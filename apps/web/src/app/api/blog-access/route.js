// Blog Access Management API - For Admin to Invite Writers
import { connection, models } from '@repo/database';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const { BlogAccess, User } = models;

// GET - List all blog access records (admin only)
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    await connection();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // invited, accepted, rejected

    const query = {};
    if (status) query.status = status;

    const accesses = await BlogAccess.find(query)
      .populate('userId', 'name email _id')
      .populate('invitedBy', 'name _id')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, data: accesses },
      { status: 200 }
    );
  } catch (error) {
    console.error('BlogAccess GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Invite user to be blog writer (admin only)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    await connection();

    const body = await req.json();
    const { userId, canWrite = true, canPublish = false, canEditOwn = true } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already invited
    let blogAccess = await BlogAccess.findOne({ userId });
    if (blogAccess) {
      return NextResponse.json(
        { success: false, error: 'User already has blog access' },
        { status: 400 }
      );
    }

    // Create new blog access invitation
    blogAccess = new BlogAccess({
      userId,
      canWrite,
      canPublish,
      canEditOwn,
      invitedBy: session.user.id,
      status: 'invited',
      invitedAt: new Date(),
    });

    await blogAccess.save();

    // Populate for response
    await blogAccess.populate('userId', 'name email _id');
    await blogAccess.populate('invitedBy', 'name _id');

    return NextResponse.json(
      { success: true, data: blogAccess, message: 'Invitation sent' },
      { status: 201 }
    );
  } catch (error) {
    console.error('BlogAccess POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
