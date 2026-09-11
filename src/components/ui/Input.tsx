'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const FIELD_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e2e8f0',
} as const;

const FIELD_CLASS =
  'w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#00c4ff] placeholder:text-slate-500';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

function FieldWrapper({ label, error, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      {children}
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Text input reproducing the search/username fields (e.g. `FriendsClient.tsx` search bar). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, style, ...rest },
  ref
) {
  return (
    <FieldWrapper label={label} error={error} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        className={cn(FIELD_CLASS, error && 'border-[#ef4444]', className)}
        style={{ ...FIELD_STYLE, ...style }}
        {...rest}
      />
    </FieldWrapper>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, className, id, style, ...rest },
  ref
) {
  return (
    <FieldWrapper label={label} error={error} htmlFor={id}>
      <textarea
        ref={ref}
        id={id}
        className={cn(FIELD_CLASS, 'resize-y min-h-[90px]', error && 'border-[#ef4444]', className)}
        style={{ ...FIELD_STYLE, ...style }}
        {...rest}
      />
    </FieldWrapper>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, style, children, ...rest },
  ref
) {
  return (
    <FieldWrapper label={label} error={error} htmlFor={id}>
      <select
        ref={ref}
        id={id}
        className={cn(FIELD_CLASS, error && 'border-[#ef4444]', className)}
        style={{ ...FIELD_STYLE, ...style }}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});
