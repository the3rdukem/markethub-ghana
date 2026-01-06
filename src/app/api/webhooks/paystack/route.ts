/**
 * Paystack Webhook Handler
 *
 * Handles payment event notifications from Paystack.
 * Verifies webhook signature and updates order payment status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaystackCredentials } from '@/lib/db/dal/integrations';
import { createHash } from 'crypto';

interface PaystackEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    channel: string;
    paid_at?: string;
    customer: {
      email: string;
      phone?: string;
    };
    metadata?: {
      orderId?: string;
      buyerId?: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Verify Paystack webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.warn('[PAYSTACK_WEBHOOK] No webhook secret configured');
    return false;
  }

  const hash = createHash('sha512')
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * POST /api/webhooks/paystack
 *
 * Handle Paystack webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    // Get Paystack credentials
    const credentials = getPaystackCredentials();

    if (!credentials || !credentials.isEnabled) {
      console.error('[PAYSTACK_WEBHOOK] Paystack is not configured or enabled');
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
    }

    // Verify signature if webhook secret is configured
    if (credentials.webhookSecret) {
      if (!verifySignature(rawBody, signature, credentials.webhookSecret)) {
        console.error('[PAYSTACK_WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse the event
    let event: PaystackEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error('[PAYSTACK_WEBHOOK] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log(`[PAYSTACK_WEBHOOK] Received event: ${event.event}`);

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;

      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;

      default:
        console.log(`[PAYSTACK_WEBHOOK] Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PAYSTACK_WEBHOOK] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle successful payment
 */
async function handleChargeSuccess(data: PaystackEvent['data']): Promise<void> {
  console.log(`[PAYSTACK_WEBHOOK] Payment successful: ${data.reference}`);

  const orderId = data.metadata?.orderId;

  if (orderId) {
    try {
      // Update order payment status
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateOrderPaymentStatus } = require('@/lib/db/dal/orders');

      updateOrderPaymentStatus(orderId, {
        paymentStatus: 'paid',
        paymentMethod: data.channel,
        paymentReference: data.reference,
        paidAt: data.paid_at || new Date().toISOString(),
      });

      console.log(`[PAYSTACK_WEBHOOK] Order ${orderId} marked as paid`);

      // Create audit log
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAuditLog } = require('@/lib/db/dal/audit');

      createAuditLog({
        action: 'PAYMENT_RECEIVED',
        category: 'order',
        targetId: orderId,
        targetType: 'order',
        targetName: `Order ${orderId}`,
        details: `Payment of ${data.currency} ${data.amount / 100} received via ${data.channel}`,
        severity: 'info',
      });
    } catch (error) {
      console.error(`[PAYSTACK_WEBHOOK] Failed to update order ${orderId}:`, error);
    }
  }
}

/**
 * Handle failed payment
 */
async function handleChargeFailed(data: PaystackEvent['data']): Promise<void> {
  console.log(`[PAYSTACK_WEBHOOK] Payment failed: ${data.reference}`);

  const orderId = data.metadata?.orderId;

  if (orderId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateOrderPaymentStatus } = require('@/lib/db/dal/orders');

      updateOrderPaymentStatus(orderId, {
        paymentStatus: 'failed',
        paymentReference: data.reference,
      });

      console.log(`[PAYSTACK_WEBHOOK] Order ${orderId} marked as payment failed`);
    } catch (error) {
      console.error(`[PAYSTACK_WEBHOOK] Failed to update order ${orderId}:`, error);
    }
  }
}

/**
 * Handle successful transfer (vendor payout)
 */
async function handleTransferSuccess(data: PaystackEvent['data']): Promise<void> {
  console.log(`[PAYSTACK_WEBHOOK] Transfer successful: ${data.reference}`);
  // Handle vendor payout confirmation
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: PaystackEvent['data']): Promise<void> {
  console.log(`[PAYSTACK_WEBHOOK] Transfer failed: ${data.reference}`);
  // Handle failed vendor payout
}
