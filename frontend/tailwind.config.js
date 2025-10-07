/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Primary - Deep Teal/Green
        primary: {
          50: '#e6f2f2',
          100: '#cce5e5',
          200: '#99cbcb',
          300: '#66b0b0',
          400: '#339696',
          500: '#0d4d4d', // Main brand teal
          600: '#0a3e3e',
          700: '#082e2e',
          800: '#051f1f',
          900: '#030f0f',
          950: '#020a0a',
        },
        // Secondary - Vibrant Orange
        secondary: {
          50: '#fff4f0',
          100: '#ffe8e0',
          200: '#ffd1c1',
          300: '#ffb9a1',
          400: '#ffa282',
          500: '#ff4420', // Main brand orange
          600: '#e63d1c',
          700: '#cc3619',
          800: '#b32e15',
          900: '#992712',
          950: '#801f0e',
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
