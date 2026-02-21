import { describe, expect, it } from 'vitest';
import { sanitizeShipmentFilters } from './shipmentService';

describe('sanitizeShipmentFilters', () => {
  it('remueve filtros vacíos sin perder filtros válidos', () => {
    const result = sanitizeShipmentFilters({
      stage_id: '',
      reference: '  ',
      created_from: '2026-02-19',
      per_page: 10,
      page: 1,
      priority: null,
    });

    expect(result).toEqual({
      created_from: '2026-02-19',
      per_page: 10,
      page: 1,
    });
  });

  it('limpia arrays y conserva solo valores no vacíos', () => {
    const result = sanitizeShipmentFilters({
      branch_ids: ['1', ' ', '2', '', null, undefined],
      transporter: ' 45 ',
    });

    expect(result).toEqual({
      branch_ids: ['1', '2'],
      transporter: '45',
    });
  });
});
