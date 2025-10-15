/**
 * BaseDialog Component
 * A reusable dialog component with consistent styling matching the design system
 * Features:
 * - Fixed dimensions (consistent width/height)
 * - Step indicator support for multi-step flows
 * - Consistent button styling
 * - Header with close button
 * - Footer with action buttons
 */

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DialogStep {
  number: number;
  label: string;
  completed?: boolean;
}

export interface BaseDialogProps {
  /** Dialog title */
  title: string;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Dialog content */
  children: ReactNode;
  /** Steps for multi-step dialogs */
  steps?: DialogStep[];
  /** Current active step (1-indexed) */
  currentStep?: number;
  /** Footer buttons */
  footerButtons?: ReactNode;
  /** Primary action button label */
  primaryButtonLabel?: string;
  /** Primary action callback */
  onPrimaryAction?: () => void;
  /** Primary button disabled state */
  primaryButtonDisabled?: boolean;
  /** Secondary action button label */
  secondaryButtonLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Custom width (defaults to 1200px) */
  width?: string;
  /** Custom height (defaults to 800px) */
  height?: string;
  /** Additional header content (e.g., Fetch button) */
  headerActions?: ReactNode;
}

export const BaseDialog: React.FC<BaseDialogProps> = ({
  title,
  isOpen,
  onClose,
  children,
  steps,
  currentStep = 1,
  footerButtons,
  primaryButtonLabel,
  onPrimaryAction,
  primaryButtonDisabled = false,
  secondaryButtonLabel,
  onSecondaryAction,
  showCloseButton = true,
  width = '1200px',
  height = '800px',
  headerActions,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width, height, maxWidth: '95vw', maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <div className="flex items-center gap-4">
              {headerActions}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Step Indicator */}
          {steps && steps.length > 0 && (
            <div className="flex items-center gap-3">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  {/* Step Circle */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium
                        ${
                          step.completed
                            ? 'bg-blue-500 text-white'
                            : step.number === currentStep
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }
                      `}
                    >
                      {step.completed ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        step.number === currentStep
                          ? 'text-gray-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 min-w-[80px] ${
                        step.completed || step.number < currentStep
                          ? 'bg-blue-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-8 py-4">
          <div className="flex items-center justify-end gap-3">
            {footerButtons ? (
              footerButtons
            ) : (
              <>
                {secondaryButtonLabel && (
                  <button
                    onClick={onSecondaryAction || onClose}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {secondaryButtonLabel}
                  </button>
                )}
                {primaryButtonLabel && (
                  <button
                    onClick={onPrimaryAction}
                    disabled={primaryButtonDisabled}
                    className={`
                      px-6 py-2.5 text-sm font-medium text-white rounded-md transition-colors
                      ${
                        primaryButtonDisabled
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }
                    `}
                  >
                    {primaryButtonLabel}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper component for dialog sections with consistent spacing
 */
export const DialogSection: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`mb-6 ${className}`}>{children}</div>
);

/**
 * Helper component for form fields in dialogs
 */
export const DialogField: React.FC<{
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}> = ({ label, required = false, children, className = '' }) => (
  <div className={`mb-6 ${className}`}>
    <label className="flex items-center gap-1 mb-2 text-sm font-medium text-gray-900">
      {required && <span className="text-red-500">*</span>}
      {label}
    </label>
    {children}
  </div>
);

/**
 * Helper component for dialog input fields
 */
export const DialogInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, placeholder, disabled = false, className = '' }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className={`
      w-full px-4 py-2.5 text-base border border-gray-300 rounded-md
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-50 disabled:text-gray-500
      placeholder:text-gray-400
      ${className}
    `}
  />
);

/**
 * Helper component for dialog textarea fields
 */
export const DialogTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  className = '',
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    className={`
      w-full px-4 py-2.5 text-base border border-gray-300 rounded-md resize-none
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-50 disabled:text-gray-500
      placeholder:text-gray-400
      ${className}
    `}
  />
);

/**
 * Helper component for dialog select fields
 */
export const DialogSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={`
      w-full px-4 py-2.5 text-base border border-gray-300 rounded-md
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-50 disabled:text-gray-500
      appearance-none bg-white
      ${className}
    `}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
      backgroundPosition: 'right 0.5rem center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '1.5em 1.5em',
      paddingRight: '2.5rem',
    }}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

/**
 * Helper component for color picker (like Tag Color in workspace dialog)
 */
export const ColorPicker: React.FC<{
  backgroundColor: string;
  textColor: string;
  onBackgroundChange: (color: string) => void;
  onTextChange: (color: string) => void;
}> = ({ backgroundColor, textColor, onBackgroundChange, onTextChange }) => (
  <div className="flex items-center gap-6">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Background</span>
      <div className="relative">
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => onBackgroundChange(e.target.value)}
          className="w-14 h-9 border border-gray-300 rounded cursor-pointer"
        />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Text</span>
      <div className="relative">
        <input
          type="color"
          value={textColor}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-14 h-9 border border-gray-300 rounded cursor-pointer"
        />
      </div>
    </div>
  </div>
);
