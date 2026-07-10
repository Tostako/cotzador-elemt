interface InputProps {
  placeholder?: string;
  value?: string | number;
  type?: 'text' | 'number' | 'password' | 'email';
  step?: string;
  onChange?: (value: string) => void;
  onInput?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Input({
  placeholder,
  value,
  type = 'text',
  step,
  onChange,
  onInput,
  className = '',
  ariaLabel,
}: InputProps) {
  return (
    <input
      className={`input ${className}`}
      type={type}
      placeholder={placeholder}
      value={value}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
      onInput={(e) => onInput?.(e.currentTarget.value)}
    />
  );
}
