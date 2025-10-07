import { Boxes } from 'lucide-react';

interface UrckLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function UrckLogo({
  size = 'md',
  showText = true,
  variant = 'dark'
}: UrckLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10'
  };

  const textColor = variant === 'dark' ? 'text-gray-900' : 'text-white';

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg`}>
        <Boxes className={`${iconSizeClasses[size]} text-white`} />
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold ${textColor}`}>
          Urck
        </span>
      )}
    </div>
  );
}
