import { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  interactive?: boolean;
  viewMode?: 'grid' | 'list';
}

const variantClasses = {
  default: 'bg-white dark:bg-gray-800',
  bordered: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-900/30',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    header,
    footer,
    children,
    className = '',
    interactive = false,
    viewMode = 'grid',
    onClick,
    ...props
  }, ref) => {
    const hasHeaderOrFooter = header || footer;
    const contentPadding = hasHeaderOrFooter ? 'none' : padding;

    const interactiveClasses = interactive
      ? `cursor-pointer transition-all group
         hover:border-blue-300 dark:hover:border-blue-600
         ${viewMode === 'grid'
           ? 'hover:shadow-md dark:hover:shadow-gray-900/30'
           : 'hover:shadow-sm dark:hover:shadow-gray-900/20'
         }`
      : '';

    return (
      <div
        ref={ref}
        className={`
          rounded-lg overflow-hidden
          ${variantClasses[variant]}
          ${!hasHeaderOrFooter ? paddingClasses[padding] : ''}
          ${interactiveClasses}
          ${className}
        `}
        onClick={onClick}
        {...props}
      >
        {header && (
          <div className={`border-b border-gray-200 dark:border-gray-700 ${paddingClasses[padding]}`}>
            {header}
          </div>
        )}

        <div className={paddingClasses[contentPadding]}>
          {children}
        </div>

        {footer && (
          <div className={`border-t border-gray-200 dark:border-gray-700 ${paddingClasses[padding]} bg-gray-50 dark:bg-gray-700/50`}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';
