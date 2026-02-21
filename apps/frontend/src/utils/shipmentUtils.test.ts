import { describe, expect, it } from 'vitest';
import { getShipmentPaymentSummary } from './shipmentUtils';
import type { Shipment } from '@/types/shipment';

const baseShipment = {
  id: 1,
  reference: 'SH-TEST',
  shipping_address: 'Calle 123',
  shipping_city: 'La Plata',
  sales: [],
} as unknown as Shipment;

describe('getShipmentPaymentSummary', () => {
  it('agrupa por método usando sale_payments y suma montos de todas las ventas', () => {
    const shipment = {
      ...baseShipment,
      sales: [
        {
          id: 140,
          receipt_number: '00008445',
          total: 280500,
          paid_amount: '0',
          pending_amount: 280500,
          status: 'active',
          date: '2025-11-10',
          subtotal: 280500,
          sale_payments: [
            { id: 1, amount: 100000, payment_method: { id: 1, name: 'Efectivo' } },
            { id: 2, amount: 50000, payment_method: { id: 2, name: 'Transferencia' } },
          ],
        },
        {
          id: 141,
          receipt_number: '00008446',
          total: 154292,
          paid_amount: '150000',
          pending_amount: 4292,
          status: 'active',
          date: '2025-11-13',
          subtotal: 154292,
          sale_payments: [
            { id: 3, amount: 50000, payment_method: { id: 1, name: 'Efectivo' } },
          ],
        },
      ],
    } as unknown as Shipment;

    const summary = getShipmentPaymentSummary(shipment);

    expect(summary.instructionsByMethod).toEqual([
      expect.objectContaining({ method: 'Efectivo', amountCollected: 150000 }),
      expect.objectContaining({ method: 'Transferencia', amountCollected: 50000 }),
    ]);
  });

  it('ordena métodos por monto descendente', () => {
    const shipment = {
      ...baseShipment,
      sales: [
        {
          id: 1,
          receipt_number: 'A',
          total: 100,
          paid_amount: '100',
          pending_amount: 0,
          status: 'active',
          date: '2026-01-01',
          subtotal: 100,
          sale_payments: [
            { id: 1, amount: 10, payment_method: { id: 1, name: 'Tarjeta' } },
            { id: 2, amount: 90, payment_method: { id: 2, name: 'Efectivo' } },
          ],
        },
      ],
    } as unknown as Shipment;

    const summary = getShipmentPaymentSummary(shipment);

    expect(summary.instructionsByMethod[0].method).toBe('Efectivo');
    expect(summary.instructionsByMethod[1].method).toBe('Tarjeta');
  });
});
