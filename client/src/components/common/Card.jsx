import React from 'react';
import { motion } from 'motion/react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = true,
  hover = false,
  onClick,
  animate = true,
  ...props
}) {
  return (
    <motion.div
      onClick={onClick}
      className={`bg-[#182234] border border-gray-700/70 rounded-2xl shadow-lg transition-colors duration-200 ${
        hover ? 'cursor-pointer' : ''
      } ${className}`}
      initial={animate ? { opacity: 0, y: 14 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      whileHover={hover ? { scale: 1.012, y: -2 } : { scale: 1.005, y: -1 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      {...props}
    >
      {(title || subtitle || action) && (
        <div
          className={`flex items-center justify-between px-6 py-4.5 ${
            headerBorder ? 'border-b border-gray-700/60' : ''
          }`}
        >
          <div>
            {title && <h3 className="text-base font-semibold text-gray-100">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

export default Card;
