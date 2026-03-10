// Feedback Management API (Admin)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connection } from '@/lib/db';
import Feedback from '@sarkari/database/src/models/Feedback';

// PUT - Mark feedback as read (admin only)
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session || session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    await connection();

    const { id } = params;
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    feedback.isRead = true;
    feedback.readAt = new Date();
    await feedback.save();

    return NextResponse.json(
      { success: true, data: feedback },
      { status: 200 }
    );
  } catch (error) {
    console.error('Feedback PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete feedback (admin only)
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session || session?.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    await connection();

    const { id } = params;
    const result = await Feedback.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Feedback deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Feedback DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
