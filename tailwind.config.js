/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Noto Sans CJK KR',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          50: '#F5F6F9',
          100: '#E9EBF1',
          200: '#D5D9E3',
          400: '#7A8397',
          600: '#3C4557',
          800: '#1A2233',
          900: '#0C1322',
        },
        brand: {
          50: '#EEF4FF',
          100: '#DCE8FF',
          200: '#BED3FF',
          300: '#92B3FF',
          500: '#2E64F0',
          600: '#1E4FD8',
          700: '#1A41B4',
        },
        paper: '#FBFAF7',
        sun: '#FFD84D',
        mint: '#17A673',
      },
      boxShadow: {
        card: '0 1px 2px rgba(12, 19, 34, 0.04), 0 10px 30px -18px rgba(12, 19, 34, 0.18)',
        lift: '0 2px 4px rgba(12, 19, 34, 0.05), 0 22px 48px -24px rgba(12, 19, 34, 0.28)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'spin-slow': 'spin-slow 0.9s linear infinite',
      },
    },
  },
  plugins: [],
};
