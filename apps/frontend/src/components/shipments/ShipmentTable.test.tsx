import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ShipmentTable from './ShipmentTable';
import type { Shipment, ShipmentStage } from '@/types/shipment';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: unknown }) => children,
  Tooltip: ({ children }: { children: unknown }) => children,
  TooltipTrigger: ({ children }: { children: unknown }) => children,
  TooltipContent: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: unknown }) => children,
  CardHeader: ({ children }: { children: unknown }) => children,
  CardContent: ({ children }: { children: unknown }) => children,
  CardFooter: ({ children }: { children: unknown }) => children,
}));

describe('ShipmentTable payment methods', () => {
  it('muestra métodos agrupados y montos por envío', () => {
    const shipments = [
      {
        id: 18,
        reference: 'SH-039YGG3O',
        shipping_address: '167 676',
        shipping_city: 'La Plata',
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
              { id: 2, amount: 50000, payment_method: { id: 1, name: 'Efectivo' } },
              { id: 3, amount: 30000, payment_method: { id: 2, name: 'Transferencia' } },
            ],
          },
        ],
        current_stage_id: 1,
        current_stage: { id: 1, name: 'rutina', order: 1 },
      },
    ] as unknown as Shipment[];

    const stages = [{ id: 1, name: 'rutina', order: 1 }] as unknown as ShipmentStage[];

    const html = renderToStaticMarkup(
      <ShipmentTable
        shipments={shipments}
        stages={stages}
        onViewShipment={() => undefined}
      />,
    );
    const normalized = html.replace(/\u00a0/g, ' ');

    expect(normalized).toContain('Medios de pago');
    expect(normalized).toContain('Efectivo');
    expect(normalized).toContain('150.000');
    expect(normalized).toContain('Transferencia');
    expect(normalized).toContain('30.000');
  });
});
