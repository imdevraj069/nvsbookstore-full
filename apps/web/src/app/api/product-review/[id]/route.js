// Product Review Moderation API (Admin)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connection } from '@/lib/db';
import ProductReview from '@sarkari/database/src/models/ProductReview';

// PUT - Approve/Reject review (admin only)
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
    const body = await req.json();
    const { isApproved } = body;

    const review = await ProductReview.findById(id);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    if (isApproved !== undefined) {
      review.isApproved = isApproved;
      if (isApproved) {
        review.approvedAt = new Date();
      }
    }

    await review.save();

    return NextResponse.json(
      { success: true, data: review },
      { status: 200 }
    );
  } catch (error) {
    console.error('ProductReview PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete review (admin only)
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
    const result = await ProductReview.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Review deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('ProductReview DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
