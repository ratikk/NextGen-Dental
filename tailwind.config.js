/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f1f9',
          100: '#e9e2f3',
          200: '#d3c6e7',
          300: '#b9a1d6',
          400: '#a183c8',
          500: '#8a6ab3', // Primary lilac color
          600: '#7856a0',
          700: '#634785',
          800: '#51396c',
          900: '#423058',
        },
        secondary: {
          50: '#edf8ff',
          100: '#dbeffe',
          200: '#bee0fc',
          300: '#91c9f9',
          400: '#5fa9f4',
          500: '#3b8def',
          600: '#2571e3',
          700: '#1e5dd0',
          800: '#1e4da9',
          900: '#1e4284',
        },
        accent: {
          50: '#fff2ed',
          100: '#ffe1d6',
          200: '#ffc0ac',
          300: '#ff9677',
          400: '#ff6341',
          500: '#ff381a',
          600: '#f01c07',
          700: '#c71507',
          800: '#9f150e',
          900: '#821610',
        },
        success: {
          50: '#edfcf2',
          100: '#d4f7e0',
          200: '#aaefcc',
          300: '#72e0b1',
          400: '#3fc993',
          500: '#1eac77',
          600: '#138c61',
          700: '#127050',
          800: '#125941',
          900: '#114a38',
        },
        warning: {
          50: '#fff9eb',
          100: '#ffefc6',
          200: '#ffe099',
          300: '#ffca5f',
          400: '#ffb02e',
          500: '#ff9405',
          600: '#e17000',
          700: '#bb4e05',
          800: '#983d0b',
          900: '#7c330d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
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
        }
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio')
  ],
}