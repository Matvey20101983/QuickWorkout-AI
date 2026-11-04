/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
          600: '#242424',
          500: '#2e2e2e',
          400: '#3a3a3a',
        },
        acid: {
          DEFAULT: '#22c55e',
          glow: '#4ade80',
        },
        neon: {
          DEFAULT: '#06b6d4',
          glow: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'acid-glow': '0 0 24px rgba(34, 197, 94, 0.45)',
        'neon-glow': '0 0 24px rgba(6, 182, 212, 0.45)',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '60%': { opacity: '1', transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        'pop-in': 'pop-in 0.4s ease-out both',
      },
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.btn-touch': {
          minHeight: '44px',
          minWidth: '44px',
          padding: '0.5rem',
        },
        '.input-touch': {
          minHeight: '44px',
          padding: '0.5rem',
        },
      });
    },
  ],
};
