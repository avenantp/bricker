import { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const variantClasses = {
  default: 'bg-white',
  bordered: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-md',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', header, footer, children, className = '', ...props }, ref) => {
    const hasHeaderOrFooter = header || footer;
    const contentPadding = hasHeaderOrFooter ? 'none' : padding;

    return (
      <div
        ref={ref}
        className={`
          rounded-lg overflow-hidden
          ${variantClasses[variant]}
          ${!hasHeaderOrFooter ? paddingClasses[padding] : ''}
          ${className}
        `}
        {...props}
      >
        {header && (
          <div className={`border-b border-gray-200 ${paddingClasses[padding]}`}>
            {header}
          </div>
        )}

        <div className={paddingClasses[contentPadding]}>
          {children}
        </div>

        {footer && (
          <div className={`border-t border-gray-200 ${paddingClasses[padding]} bg-gray-50`}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';
