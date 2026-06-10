import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'default' | 'small';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = variant === 'secondary' ? 'btn-secondary' : variant === 'danger' ? 'btn-danger' : variant === 'success' ? 'btn-success' : '';
  const sizeClass = size === 'small' ? 'btn-small' : '';

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
