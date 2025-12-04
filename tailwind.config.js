/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // ✅ NEXTGEN ORANGE THEME
        primary: {
          50: '#fef3e9',
          100: '#fce8d4',
          200: '#f9d1a9',
          300: '#f5b97e',
          400: '#f2a253',
          500: '#f08929', // Main Brand Color (Orange)
          600: '#d87a24',
          700: '#b4661e',
          800: '#8f5118',
          900: '#734113',
        },
        // Complementary Teal
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00B4A6', 
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        accent: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
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
    require('@tailwindcss/aspect-ratio'),
    // Essential for Blog & Contact Forms to render correctly
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
