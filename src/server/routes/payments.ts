import { Hono } from 'hono';
import type { PaymentHandlerRequest, PaymentHandlerResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { applyOrder, revertOrder } from '../core/inventory.ts';

export const paymentRoutes = new Hono();

paymentRoutes.post('/fulfill', async (c) => {
  try {
    const order = await c.req.json<PaymentHandlerRequest>();
    if (order.status !== 'PAID' && order.status !== 'DELIVERED') {
      return c.json<PaymentHandlerResponse>({ success: false, reason: 'Order is not paid.' });
    }
    const buyer = order.metadata?.['buyerId'] || context.userId;
    if (!buyer) {
      console.error(`Order ${order.id}: buyer could not be determined`);
      return c.json<PaymentHandlerResponse>({ success: false, reason: 'Buyer unknown.' });
    }
    const result = await applyOrder(
      redis,
      { id: order.id, skus: order.products.map((p) => p.sku) },
      buyer,
      Date.now(),
      order.metadata?.['runId']
    );
    if (!result.ok) {
      console.error(`Order ${order.id} rejected: ${result.reason}`);
      return c.json<PaymentHandlerResponse>({ success: false, reason: result.reason });
    }
    console.log(`Order ${order.id} fulfilled${result.already ? ' (repeat)' : ''}`);
    return c.json<PaymentHandlerResponse>({ success: true });
  } catch (e) {
    console.error('Payment fulfillment failed', e);
    return c.json<PaymentHandlerResponse>({ success: false, reason: 'Internal error.' });
  }
});

paymentRoutes.post('/refund', async (c) => {
  try {
    const order = await c.req.json<PaymentHandlerRequest>();
    const reverted = await revertOrder(redis, order.id, Date.now());
    console.log(`Order ${order.id} refunded; ${reverted ? 'effects reverted' : 'nothing to revert'}`);
  } catch (e) {
    console.error('Payment refund handling failed', e);
  }
  return c.json<PaymentHandlerResponse>({ success: true });
});
