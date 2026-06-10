'use client';

import { parseLocalizedNumber, sanitizeNumericInput } from '@/lib/numerals';
import { cn } from '@/lib/utils';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  inputClassName?: string;
}

export function NumericInput({ value, onChange, className, inputClassName, ...rest }: NumericInputProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      className={cn('input', inputClassName, className)}
      value={value === 0 ? '' : String(value)}
      onChange={(e) => {
        const sanitized = sanitizeNumericInput(e.target.value);
        onChange(parseLocalizedNumber(sanitized));
      }}
    />
  );
}
