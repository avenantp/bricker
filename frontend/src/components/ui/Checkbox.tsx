import { forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="flex items-start">
          <div className="relative flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              className="sr-only peer"
              {...props}
            />
            <div
              className={`
                w-5 h-5 border-2 rounded flex items-center justify-center transition-all cursor-pointer
                ${
                  error
                    ? 'border-red-300 peer-focus:ring-red-500'
                    : 'border-gray-300 peer-focus:ring-primary-500'
                }
                peer-checked:bg-primary-600 peer-checked:border-primary-600
                peer-focus:ring-2 peer-focus:ring-opacity-50
                peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed
                ${className}
              `}
            >
              <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>

          {(label || description) && (
            <div className="ml-3 flex-1">
              {label && (
                <label className="text-sm font-medium text-gray-700 cursor-pointer">
                  {label}
                </label>
              )}
              {description && (
                <p className="text-sm text-gray-500">{description}</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600 ml-8">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
