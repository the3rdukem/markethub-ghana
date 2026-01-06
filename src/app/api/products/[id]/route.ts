/**
 * Product API Route
 *
 * Operations for a specific product.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/db/dal/sessions';
import {
  getProductById,
  updateProduct,
  deleteProduct,
  UpdateProductInput,
} from '@/lib/db/dal/products';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const product = getProductById(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check access for non-active products
    if (product.status !== 'active') {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session_token')?.value;
      const session = sessionToken ? validateSession(sessionToken) : null;

      if (!session) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Only owner or admin can see non-active products
      if (
        session.user_id !== product.vendor_id &&
        session.user_role !== 'admin' &&
        session.user_role !== 'master_admin'
      ) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    return NextResponse.json({
      product: {
        id: product.id,
        vendorId: product.vendor_id,
        vendorName: product.vendor_name,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        comparePrice: product.compare_price,
        costPerItem: product.cost_per_item,
        sku: product.sku,
        barcode: product.barcode,
        quantity: product.quantity,
        trackQuantity: product.track_quantity === 1,
        images: product.images ? JSON.parse(product.images) : [],
        weight: product.weight,
        dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
        tags: product.tags ? JSON.parse(product.tags) : [],
        status: product.status,
        categoryAttributes: product.category_attributes
          ? JSON.parse(product.category_attributes)
          : {},
        isFeatured: product.is_featured === 1,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

/**
 * PUT /api/products/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const session = validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const product = getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check ownership or admin access
    if (
      session.user_id !== product.vendor_id &&
      session.user_role !== 'admin' &&
      session.user_role !== 'master_admin'
    ) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const updates: UpdateProductInput = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.price !== undefined) updates.price = parseFloat(body.price);
    if (body.comparePrice !== undefined)
      updates.comparePrice = body.comparePrice ? parseFloat(body.comparePrice) : undefined;
    if (body.quantity !== undefined) updates.quantity = parseInt(body.quantity, 10);
    if (body.trackQuantity !== undefined) updates.trackQuantity = body.trackQuantity;
    if (body.images !== undefined) updates.images = body.images;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.status !== undefined) updates.status = body.status;
    if (body.categoryAttributes !== undefined)
      updates.categoryAttributes = body.categoryAttributes;
    if (body.isFeatured !== undefined && (session.user_role === 'admin' || session.user_role === 'master_admin')) {
      updates.isFeatured = body.isFeatured;
      updates.featuredBy = session.user_id;
    }

    const updatedProduct = updateProduct(id, updates);

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        vendorId: updatedProduct.vendor_id,
        name: updatedProduct.name,
        status: updatedProduct.status,
        updatedAt: updatedProduct.updated_at,
      },
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const session = validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const product = getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check ownership or admin access
    if (
      session.user_id !== product.vendor_id &&
      session.user_role !== 'admin' &&
      session.user_role !== 'master_admin'
    ) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const success = deleteProduct(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
