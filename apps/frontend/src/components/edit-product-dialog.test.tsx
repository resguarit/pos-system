// @vitest-environment jsdom

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditProductDialog } from '@/components/edit-product-dialog';
import type { Product } from '@/types/product';

const { requestMock, dispatchMock, successMock, errorMock, pricingFns } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  dispatchMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  pricingFns: {
    updateUnitPrice: vi.fn(),
    updateMarkup: vi.fn(),
    updateSalePrice: vi.fn(),
    updateCurrency: vi.fn(),
    updateIvaRate: vi.fn(),
    validatePricing: vi.fn(() => true),
    formatPrice: vi.fn((price: number) => `$${price}`),
    formatMarkup: vi.fn((value: number) => `${value}`),
    calculateSalePrice: vi.fn((nextUnitPrice: number, _currency: string, nextMarkup: number, nextIvaRate: number) => {
      return nextUnitPrice * (1 + nextMarkup) * (1 + nextIvaRate);
    }),
  },
}));

vi.mock('@/hooks/useApi', () => ({
  default: () => ({
    request: requestMock,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/context/EntityContext', () => ({
  useEntityContext: () => ({
    dispatch: dispatchMock,
  }),
}));

vi.mock('sileo', () => ({
  sileo: {
    success: successMock,
    error: errorMock,
  },
}));

vi.mock('@/hooks/usePricing', () => ({
  usePricing: ({
    unitPrice = 0,
    currency = 'ARS',
    markup = 0,
    ivaRate = 0,
    initialSalePrice = 0,
  }: {
    unitPrice?: number;
    currency?: string;
    markup?: number;
    ivaRate?: number;
    initialSalePrice?: number;
  }) => ({
    pricing: {
      unitPrice,
      currency,
      markup,
      ivaRate,
      salePrice: initialSalePrice,
      hasChanged: false,
    },
    updateUnitPrice: pricingFns.updateUnitPrice,
    updateMarkup: pricingFns.updateMarkup,
    updateSalePrice: pricingFns.updateSalePrice,
    updateCurrency: pricingFns.updateCurrency,
    updateIvaRate: pricingFns.updateIvaRate,
    validatePricing: pricingFns.validatePricing,
    formatPrice: pricingFns.formatPrice,
    formatMarkup: pricingFns.formatMarkup,
    calculateSalePrice: pricingFns.calculateSalePrice,
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/formatted-number-input', () => ({
  default: ({ id, value, onChange, placeholder }: { id?: string; value: string; onChange: (value: string) => void; placeholder?: string }) => (
    <input
      id={id}
      aria-label={id}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const baseProduct = (overrides: Partial<Product>): Product => ({
  id: 1,
  description: 'Producto A',
  code: 'A-001',
  measure_id: 1,
  unit_price: '100',
  currency: 'ARS',
  markup: '0.20',
  category_id: 1,
  iva_id: 1,
  image_id: null,
  supplier_id: 1,
  status: true,
  web: true,
  allow_discount: true,
  observaciones: 'Obs A',
  created_at: '2026-03-17 00:00:00',
  updated_at: '2026-03-17 00:00:00',
  deleted_at: null,
  sale_price: 150,
  measure: { id: 1, name: 'Unidad', created_at: '', updated_at: '', deleted_at: null },
  category: { id: 1, name: 'Cat', created_at: '', updated_at: '', deleted_at: null },
  iva: { id: 1, name: 'IVA 21', rate: 21, created_at: '', updated_at: '', deleted_at: null },
  supplier: {
    id: 1,
    name: 'Proveedor',
    contact_name: null,
    phone: '',
    email: '',
    cuit: '',
    address: '',
    status: 'active',
    created_at: '',
    updated_at: '',
    deleted_at: null,
  },
  stocks: [],
  ...overrides,
});

describe('EditProductDialog', () => {
  beforeEach(() => {
    cleanup();
    requestMock.mockReset();
    dispatchMock.mockReset();
    successMock.mockReset();
    errorMock.mockReset();
    pricingFns.updateUnitPrice.mockReset();
    pricingFns.updateMarkup.mockReset();
    pricingFns.updateSalePrice.mockReset();
    pricingFns.updateCurrency.mockReset();
    pricingFns.updateIvaRate.mockReset();
    pricingFns.validatePricing.mockClear();
    pricingFns.formatPrice.mockClear();
    pricingFns.formatMarkup.mockClear();
    pricingFns.calculateSalePrice.mockClear();

    requestMock.mockImplementation(async ({ method, url }: { method: string; url: string }) => {
      if (method === 'GET' && url === '/categories/for-selector') return [];
      if (method === 'GET' && url === '/measures') return [];
      if (method === 'GET' && url === '/suppliers') return [];
      if (method === 'GET' && url === '/ivas') return [];
      if (method === 'GET' && url === '/branches') return [{ id: 1, name: 'Central', description: 'Central' }];
      if (method === 'GET' && url.startsWith('/stocks?')) return [];
      if (method === 'PUT' && url.startsWith('/products/')) return { success: true };
      return {};
    });
  });

  it('resetea los campos al reabrir con otro producto', async () => {
    const productA = baseProduct({ id: 1, description: 'Producto A', code: 'A-001', unit_price: '100', sale_price: 150, observaciones: 'Obs A' });
    const productB = baseProduct({ id: 2, description: 'Producto B', code: 'B-002', unit_price: '250', sale_price: 400, observaciones: 'Obs B' });

    const onOpenChange = vi.fn();
    const onProductUpdated = vi.fn();

    const { rerender } = render(
      <EditProductDialog
        open={true}
        onOpenChange={onOpenChange}
        product={productA}
        onProductUpdated={onProductUpdated}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Descripción') as HTMLInputElement).value).toBe('Producto A');
    });

    expect((screen.getByLabelText('Código') as HTMLInputElement).value).toBe('A-001');
    expect((screen.getByLabelText('unit_price') as HTMLInputElement).value).toBe('100');
    expect((screen.getByLabelText('Observaciones') as HTMLTextAreaElement).value).toBe('Obs A');

    rerender(
      <EditProductDialog
        open={false}
        onOpenChange={onOpenChange}
        product={null}
        onProductUpdated={onProductUpdated}
      />,
    );

    rerender(
      <EditProductDialog
        open={true}
        onOpenChange={onOpenChange}
        product={productB}
        onProductUpdated={onProductUpdated}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Descripción') as HTMLInputElement).value).toBe('Producto B');
    });

    expect((screen.getByLabelText('Código') as HTMLInputElement).value).toBe('B-002');
    expect((screen.getByLabelText('unit_price') as HTMLInputElement).value).toBe('250');
    expect((screen.getByLabelText('Observaciones') as HTMLTextAreaElement).value).toBe('Obs B');
  });

  it('guarda usando el id del producto actualmente abierto', async () => {
    const productA = baseProduct({ id: 1, description: 'Producto A', code: 'A-001', unit_price: '100', sale_price: 150 });
    const productB = baseProduct({ id: 2, description: 'Producto B', code: 'B-002', unit_price: '250', sale_price: 400 });

    const onOpenChange = vi.fn();
    const onProductUpdated = vi.fn();

    const { rerender } = render(
      <EditProductDialog
        open={true}
        onOpenChange={onOpenChange}
        product={productA}
        onProductUpdated={onProductUpdated}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Descripción') as HTMLInputElement).value).toBe('Producto A');
    });

    rerender(
      <EditProductDialog
        open={false}
        onOpenChange={onOpenChange}
        product={null}
        onProductUpdated={onProductUpdated}
      />,
    );

    rerender(
      <EditProductDialog
        open={true}
        onOpenChange={onOpenChange}
        product={productB}
        onProductUpdated={onProductUpdated}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Descripción') as HTMLInputElement).value).toBe('Producto B');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/products/2',
        }),
      );
    });

    expect(onProductUpdated).toHaveBeenCalledTimes(1);
    expect(successMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Producto actualizado correctamente' }));
  });
});