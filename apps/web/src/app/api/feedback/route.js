// Feedback Collection API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connection } from '@/lib/db';
import Feedback from '../../../../../packages/database/src/models/Feedback';
import Order from '../../../../../packages/database/src/models/Order';

// GET - List feedback (admin only)
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const feedbackType = searchParams.get('feedbackType');
    const isRead = searchParams.get('isRead');

    const query = {};
    if (feedbackType) query.feedbackType = feedbackType;
    if (isRead === 'true') query.isRead = true;
    if (isRead === 'false') query.isRead = false;

    const skip = (page - 1) * limit;

    const feedback = await Feedback.find(query)
      .populate('customer', 'name email _id')
      .populate('order', '_id totalAmount createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: feedback,
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
    console.error('Feedback GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit feedback (auth required)
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
    const {
      orderId,
      feedbackType,
      overallSatisfaction,
      productQuality,
      deliverySpeed,
      customerService,
      whatWentWell,
      whatCouldImprove,
      suggestions,
      wouldRecommend,
      likelyToRepurchase,
    } = body;

    if (!orderId || !feedbackType || !overallSatisfaction) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify order belongs to user
    const order = await Order.findById(orderId);
    if (!order || order.customer.toString() !== session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid order' },
        { status: 404 }
      );
    }

    // Check if feedback already submitted for this order
    const existingFeedback = await Feedback.findOne({
      order: orderId,
    });

    if (existingFeedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback already submitted for this order' },
        { status: 400 }
      );
    }

    const feedback = new Feedback({
      order: orderId,
      customer: session?.user?.id,
      customerName: session?.user?.name,
      customerEmail: session?.user?.email,
      feedbackType,
      overallSatisfaction,
      productQuality: productQuality || 0,
      deliverySpeed: deliverySpeed || 0,
      customerService: customerService || 0,
      whatWentWell,
      whatCouldImprove,
      suggestions,
      wouldRecommend: wouldRecommend || false,
      likelyToRepurchase: likelyToRepurchase || false,
      isRead: false,
    });

    await feedback.save();

    return NextResponse.json(
      { success: true, data: feedback, message: 'Feedback submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Feedback POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
