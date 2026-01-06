/**
 * Seed Test Data API
 *
 * Creates test vendors, products, and buyers for testing.
 * Only works in development or when explicitly enabled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedAllTestData } from '@/lib/db/dal/seed-test-data';

/**
 * POST /api/seed
 *
 * Seed test data into the database
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with explicit header
    const isDev = process.env.NODE_ENV !== 'production';
    const hasDevHeader = request.headers.get('x-seed-auth') === 'markethub-dev-2024';

    if (!isDev && !hasDevHeader) {
      return NextResponse.json(
        { error: 'Seeding is only available in development mode' },
        { status: 403 }
      );
    }

    // Seed the test data
    seedAllTestData();

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully',
      accounts: {
        masterAdmin: {
          email: 'the3rdukem@gmail.com',
          password: '123asdqweX$',
          note: 'Use this for Admin → API Management',
        },
        testVendor: {
          email: 'testvendor@markethub.gh',
          password: 'TestVendor123!',
          note: 'Use this for /vendor/verify testing',
        },
        testBuyer: {
          email: 'testbuyer@markethub.gh',
          password: 'TestBuyer123!',
          note: 'Use this for checkout testing',
        },
      },
    });
  } catch (error) {
    console.error('[SEED] Error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}

/**
 * GET /api/seed
 *
 * Get test account information
 */
export async function GET() {
  return NextResponse.json({
    message: 'Test Account Information',
    accounts: {
      masterAdmin: {
        email: 'the3rdukem@gmail.com',
        password: '123asdqweX$',
        loginUrl: '/admin/login',
        note: 'Master Admin - Full system access including API Management',
      },
      testVendor: {
        email: 'testvendor@markethub.gh',
        password: 'TestVendor123!',
        loginUrl: '/vendor/login',
        note: 'Test Vendor - For verification flow testing. POST /api/seed first to create.',
      },
      testBuyer: {
        email: 'testbuyer@markethub.gh',
        password: 'TestBuyer123!',
        loginUrl: '/auth/login',
        note: 'Test Buyer - For checkout flow testing. POST /api/seed first to create.',
      },
    },
    testingGuide: {
      step1: 'POST /api/seed to create test accounts and products',
      step2: 'Login as Master Admin at /admin/login',
      step3: 'Go to API Management tab and configure Smile Identity (sandbox mode)',
      step4: 'Register a new vendor at /auth/register or use test vendor',
      step5: 'Go to /vendor/verify and try instant verification',
      step6: 'Add products to cart and test checkout with Paystack',
    },
  });
}
