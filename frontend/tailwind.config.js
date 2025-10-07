/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Primary - uses CSS variables that change based on dark mode
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        // Secondary - Vibrant Orange
        secondary: {
          50: "#FFF0F0",
          100: "#FFDEDC",
          200: "#FFBFBC",
          300: "#FF9B94",
          400: "#FF7165",
          500: "#FF3D12",
          600: "#CC2B00",
          700: "#9C1F00",
          800: "#6E1300",
          900: "#410700",
          950: "#2E0400"
        },
        // Accent - Warm Beige
        accent: {
          50: '#faf8f5',
          100: '#f5f1eb',
          200: '#ebe3d7',
          300: '#e1d5c3',
          400: '#d7c7af',
          500: '#d4c4a8', // Main beige
          600: '#c0ac8f',
          700: '#a89476',
          800: '#8f7c5d',
          900: '#766444',
        },
        // Neutral - Cream/Off-white
        neutral: {
          50: '#ffffff',
          100: '#fafaf9',
          200: '#f5f5f4',
          300: '#ede9e3', // Main cream
          400: '#d6d3cd',
          500: '#a8a29e',
          600: '#78716c',
          700: '#57534e',
          800: '#44403c',
          900: '#292524',
          950: '#1c1917',
        },
        // Keep some grayscale for UI
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      backgroundColor: {
        'brand-dark': '#0d4d4d',
        'brand-orange': '#ff4420',
        'brand-beige': '#d4c4a8',
        'brand-cream': '#ede9e3',
      },
      textColor: {
        'brand-dark': '#0d4d4d',
        'brand-orange': '#ff4420',
        'brand-beige': '#d4c4a8',
        'brand-cream': '#ede9e3',
      },
      borderColor: {
        'brand-dark': '#0d4d4d',
        'brand-orange': '#ff4420',
        'brand-beige': '#d4c4a8',
        'brand-cream': '#ede9e3',
      },
    },
  },
  plugins: [],
};
