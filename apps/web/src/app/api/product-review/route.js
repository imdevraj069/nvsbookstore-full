// Product Review API Routes
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connection } from '@/lib/db';
import ProductReview from '@sarkari/database/src/models/ProductReview';
import Order from '@sarkari/database/src/models/Order';

// GET - List reviews for a product
export async function GET(req) {
  try {
    await connection();

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const sort = searchParams.get('sort') || 'newest'; // newest, helpful, rating

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    const query = { product: productId, isApproved: true };
    const skip = (page - 1) * limit;

    let sortObj = { createdAt: -1 };
    if (sort === 'helpful') {
      sortObj = { helpful: -1 };
    } else if (sort === 'rating') {
      sortObj = { rating: -1 };
    }

    const reviews = await ProductReview.find(query)
      .populate('customer', 'name _id')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const total = await ProductReview.countDocuments(query);

    // Calculate rating stats
    const allReviews = await ProductReview.find({ product: productId, isApproved: true });
    const avgRating = allReviews.length
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : 0;

    const ratingDistribution = {
      5: allReviews.filter((r) => r.rating === 5).length,
      4: allReviews.filter((r) => r.rating === 4).length,
      3: allReviews.filter((r) => r.rating === 3).length,
      2: allReviews.filter((r) => r.rating === 2).length,
      1: allReviews.filter((r) => r.rating === 1).length,
    };

    return NextResponse.json(
      {
        success: true,
        data: reviews,
        stats: {
          averageRating: parseFloat(avgRating),
          totalReviews: allReviews.length,
          ratingDistribution,
        },
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
    console.error('ProductReview GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new review
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

    const body = await req.json();
    const { productId, title, comment, rating, orderRef } = body;

    if (!productId || !rating || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this product
    const existingReview = await ProductReview.findOne({
      product: productId,
      customer: session?.user?.id,
    });

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    // Check if order exists and user is the buyer (for verified purchase flag)
    let isVerifiedPurchase = false;
    if (orderRef) {
      const order = await Order.findById(orderRef);
      if (order && order.customer.toString() === session.user.id) {
        isVerifiedPurchase = true;
      }
    }

    const review = new ProductReview({
      product: productId,
      customer: session?.user?.id,
      customerName: session?.user?.name,
      title,
      comment,
      rating,
      isVerifiedPurchase,
      orderRef,
      isApproved: false, // Default to awaiting approval
    });

    await review.save();

    return NextResponse.json(
      { success: true, data: review, message: 'Review submitted for approval' },
      { status: 201 }
    );
  } catch (error) {
    console.error('ProductReview POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
