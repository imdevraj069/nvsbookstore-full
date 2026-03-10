// Product Review Helpful/Unhelpful Voting
import { connection, models } from '@repo/database';
import { NextResponse } from 'next/server';

const { ProductReview } = models;

// POST - Mark review as helpful/unhelpful
export async function POST(req, { params }) {
  try {
    await connection();

    const { id } = params;
    const body = await req.json();
    const { helpful } = body; // true for helpful, false for unhelpful

    const review = await ProductReview.findById(id);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    if (helpful === true) {
      review.helpful = (review.helpful || 0) + 1;
    } else if (helpful === false) {
      review.notHelpful = (review.notHelpful || 0) + 1;
    }

    await review.save();

    return NextResponse.json(
      { success: true, data: review },
      { status: 200 }
    );
  } catch (error) {
    console.error('Review Vote Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
