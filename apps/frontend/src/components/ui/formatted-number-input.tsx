import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { NumberFormatter } from '@/lib/formatters/numberFormatter';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  formatType?: 'number' | 'currency' | 'unitPrice' | 'salePrice' | 'percentage';
  currency?: string;
  decimals?: number;
  showCurrency?: boolean;
  locale?: string;
}

/**
 * Componente de input formateado siguiendo principios SOLID
 * SRP: Responsabilidad única de manejar inputs formateados
 * OCP: Abierto para extensión con diferentes tipos de formato
 */
export const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({
    value,
    onChange,
    formatType = 'number',
    currency = 'ARS',
    decimals = 2,
    showCurrency = false,
    locale = 'es-AR',
    className,
    ...props
  }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Formatear el valor para mostrar
    const formatValue = (val: number | string): string => {
      switch (formatType) {
        case 'currency':
          return NumberFormatter.formatCurrency(val, {
            currency,
            showCurrency,
            locale,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
        case 'unitPrice':
          return NumberFormatter.formatUnitPrice(val, currency);
        case 'salePrice':
          return NumberFormatter.formatSalePrice(val, currency);
        case 'percentage':
          return NumberFormatter.formatPercentage(val, decimals);
        default:
          return NumberFormatter.formatNumber(val, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            locale
          });
      }
    };

    // Actualizar displayValue cuando cambie el value prop
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatValue(value));
      }
    }, [value, isFocused, formatType, currency, decimals, showCurrency, locale]);

    const handleFocus = () => {
      setIsFocused(true);
      // Mostrar valor sin formatear cuando se enfoca
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      setDisplayValue(isNaN(numericValue) ? '' : numericValue.toString());
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Formatear cuando se desenfoca
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numericValue)) {
        setDisplayValue(formatValue(numericValue));
        onChange(numericValue);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);

      // Parsear el valor y notificar al padre
      const parsedValue = NumberFormatter.parseFormattedNumber(inputValue);
      if (!isNaN(parsedValue)) {
        onChange(parsedValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permitir teclas de navegación y edición
      const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End'
      ];

      // Permitir números, punto, coma y signos
      const isNumber = /[0-9]/.test(e.key);
      const isDecimal = /[.,]/.test(e.key);
      const isSign = /[+-]/.test(e.key);
      const isAllowedKey = allowedKeys.includes(e.key);

      if (!isNumber && !isDecimal && !isSign && !isAllowedKey) {
        e.preventDefault();
      }

      // Evitar múltiples puntos decimales
      if (isDecimal && displayValue.includes('.') && displayValue.includes(',')) {
        e.preventDefault();
      }
    };

    return (
      <Input
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
    );
  }
);

FormattedNumberInput.displayName = 'FormattedNumberInput';

export default FormattedNumberInput;
