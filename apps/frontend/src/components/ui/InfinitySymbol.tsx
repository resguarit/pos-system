import React from 'react';

interface InfinitySymbolProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const InfinitySymbol: React.FC<InfinitySymbolProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'text-sm',
    sm: 'text-base', 
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <span 
      className={`text-blue-600 font-bold ${sizeClasses[size]} ${className}`}
      style={{ 
        fontSize: size === 'xl' ? '2.5rem' : undefined,
        lineHeight: '1',
        display: 'inline-block',
        transform: size === 'xs' ? 'scale(1.1)' : 'scale(1.2)', // Menos escala para xs
      }}
    >
      ∞
    </span>
  );
};
