// Individual Blog Access Update/Delete
import { connection, models } from '@repo/database';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const { BlogAccess } = models;

// PUT - Update blog access (admin only, or user accepting invitation)
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connection();

    const { id } = params;
    const blogAccess = await BlogAccess.findById(id);

    if (!blogAccess) {
      return NextResponse.json(
        { success: false, error: 'Blog access not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { status, canWrite, canPublish, canEditOwn } = body;

    // Users can accept/reject their own invitation
    // Admin can update anything
    if (
      blogAccess.userId.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this access' },
        { status: 403 }
      );
    }

    // Users can only accept or reject (not change permissions)
    if (session.user.role !== 'admin') {
      if (!['accepted', 'rejected'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status for user' },
          { status: 400 }
        );
      }
      blogAccess.status = status;
      if (status === 'accepted') {
        blogAccess.acceptedAt = new Date();
      }
    } else {
      // Admin can update anything
      if (status) blogAccess.status = status;
      if (canWrite !== undefined) blogAccess.canWrite = canWrite;
      if (canPublish !== undefined) blogAccess.canPublish = canPublish;
      if (canEditOwn !== undefined) blogAccess.canEditOwn = canEditOwn;

      if (status === 'accepted') {
        blogAccess.acceptedAt = new Date();
      }
    }

    await blogAccess.save();
    await blogAccess.populate('userId', 'name email _id');
    await blogAccess.populate('invitedBy', 'name _id');

    return NextResponse.json(
      { success: true, data: blogAccess },
      { status: 200 }
    );
  } catch (error) {
    console.error('BlogAccess PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Revoke blog access (admin only)
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    await connection();

    const { id } = params;
    const result = await BlogAccess.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Blog access not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Access revoked' },
      { status: 200 }
    );
  } catch (error) {
    console.error('BlogAccess DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
