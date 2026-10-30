import React from 'react';

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}) {
  const normalizedVariant = String(variant).toLowerCase();

  const styles = {
    available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    unavailable: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    classroom: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    'seminar hall': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    lab: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  const dotColors = {
    available: 'bg-emerald-400 animate-pulse',
    approved: 'bg-emerald-400',
    unavailable: 'bg-rose-400',
    rejected: 'bg-rose-400',
    pending: 'bg-amber-400 animate-pulse',
    inactive: 'bg-gray-400',
    indigo: 'bg-indigo-400',
    cyan: 'bg-cyan-400',
    default: 'bg-gray-400',
    classroom: 'bg-indigo-400',
    'seminar hall': 'bg-purple-400',
    lab: 'bg-emerald-400',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 font-semibold',
    sm: 'text-xs px-2.5 py-1 font-medium',
    md: 'text-sm px-3 py-1.5 font-medium',
  };

  const selectedStyle = styles[normalizedVariant] || styles.default;
  const selectedDotColor = dotColors[normalizedVariant] || dotColors.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase ${selectedStyle} ${
        sizes[size] || sizes.sm
      } ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedDotColor}`} />}
      {children}
    </span>
  );
}

export default Badge;
