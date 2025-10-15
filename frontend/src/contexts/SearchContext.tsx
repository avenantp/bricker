/**
 * Search Context
 * Provides context-aware search functionality across the application
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder: string;
  setSearchPlaceholder: (placeholder: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('Search...');

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchPlaceholder,
        setSearchPlaceholder,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
