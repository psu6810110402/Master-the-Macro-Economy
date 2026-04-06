import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  ...props 
}) => {
  const variantStyles = {
    primary: 'bg-[oklch(var(--accent-brand))] text-white hover:shadow-[0_0_20px_oklch(var(--accent-brand)_/_0.4)]',
    secondary: 'bg-[oklch(var(--bg-card))] border-2 border-[oklch(var(--border-strong))] text-[oklch(var(--text-primary))] hover:bg-[oklch(var(--text-primary))] hover:text-black',
    ghost: 'bg-transparent border-2 border-[oklch(var(--border-strong))] text-[oklch(var(--text-primary))] hover:bg-[oklch(var(--text-primary))] hover:text-black hover:border-transparent',
  };

  return (
    <button
      className={`
        relative inline-flex items-center justify-center
        px-10 py-4 font-black text-sm uppercase tracking-[0.2em]
        transition-all duration-300
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        cursor-pointer
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
