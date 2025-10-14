/**
 * Breadcrumb Navigation Component
 * Displays hierarchical navigation path with clickable links
 */

import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  showHome?: boolean;
}

export function Breadcrumb({ items, homeHref = '/projects', showHome = true }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {showHome && (
        <>
          <Link
            to={homeHref}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          {items.length > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate max-w-[200px]">{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-900 font-medium">
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate max-w-[200px]">{item.label}</span>
              </span>
            )}

            {!isLast && (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
