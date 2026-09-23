/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — one strong, restrained teal for trust + service reliability.
        brand: {
          50: '#effaf7',
          100: '#d7f2ec',
          200: '#b0e5d9',
          300: '#7dd1c0',
          400: '#46b6a4',
          500: '#279b8a',
          600: '#0f766e',
          700: '#0e6560',
          800: '#0f5250',
          900: '#104444',
          950: '#042f2e',
        },
        // Surfaces — neutral foundation.
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f7f7f5',
          inset: '#f0efec',
        },
        ink: {
          DEFAULT: '#1c1917',
          muted: '#57534e',
          faint: '#78716c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(28, 25, 23, 0.06)',
        card: '0 1px 2px rgba(28, 25, 23, 0.06), 0 2px 6px rgba(28, 25, 23, 0.07)',
        modal: '0 8px 32px rgba(28, 25, 23, 0.12)',
      },
      maxWidth: {
        shell: '72rem',
      },
      transitionDuration: {
        150: '150ms',
      },
    },
  },
  plugins: [
    // scrollbar-hide utility
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
};

