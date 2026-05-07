import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 active:scale-95',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-95',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/10 active:scale-95',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 active:bg-gray-200',
    outline: 'bg-transparent border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 active:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider',
    md: 'px-4 py-2 text-xs font-bold uppercase tracking-widest',
    lg: 'px-6 py-3 text-sm font-bold uppercase tracking-[0.1em]',
    icon: 'p-2',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
