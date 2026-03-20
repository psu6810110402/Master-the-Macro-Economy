interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

// A refined, high-impact button that avoids standard generic UI traps
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
        relative overflow-hidden
        px-10 py-4 font-black text-sm uppercase tracking-[0.2em]
        transition-all duration-300 ease-out-expo
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-white/10 translate-y-full transition-transform duration-300 ease-out-expo hover:translate-y-0" />
      )}
    </button>
  );
};
