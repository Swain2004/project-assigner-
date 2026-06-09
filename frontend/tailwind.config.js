/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#007AFF',
          600: '#0066E0',
          700: '#0055C4',
        },
        gray: {
          50: '#F5F5F7',
          100: '#F2F2F2',
          150: '#EBEBEB',
          200: '#D2D2D7',
          300: '#AEAEB2',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#3A3A3C',
          800: '#2C2C2E',
          900: '#1C1C1E',
          950: '#141414',
        },
        green: {
          50: '#F0FFF4',
          100: '#DCFCE7',
          500: '#30D158',
          600: '#25A244',
        },
        red: {
          50: '#FFF5F5',
          100: '#FEE2E2',
          500: '#FF453A',
          600: '#E5342B',
        },
        orange: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#FF9F0A',
          600: '#E5850A',
        },
        purple: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#5856D6',
          600: '#4543BB',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        ios: '10px',
        'ios-md': '14px',
        'ios-lg': '18px',
        'ios-xl': '24px',
      },
      boxShadow: {
        apple: '0 2px 20px rgba(0, 0, 0, 0.07)',
        'apple-md': '0 4px 32px rgba(0, 0, 0, 0.10)',
        'apple-lg': '0 8px 48px rgba(0, 0, 0, 0.14)',
        'apple-sm': '0 1px 8px rgba(0, 0, 0, 0.06)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      backdropBlur: {
        ios: '20px',
        'ios-lg': '40px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease',
        'slide-up': 'slideUp 0.25s ease',
        'slide-down': 'slideDown 0.25s ease',
        'scale-in': 'scaleIn 0.15s ease',
        'slide-in-right': 'slideInRight 0.3s ease',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};
