/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#0a0b0f',
          panel: '#15171e',
          raised: '#1c1f28',
          border: '#2b2f3a',
        },
        ink: {
          DEFAULT: '#f1f2f4',
          dim: '#b7bcc8',
          faint: '#8b93a6',
        },
        accent: {
          DEFAULT: '#f5a623',
          hover: '#ffb84d',
          soft: '#3a2c14',
        },
      },
    },
  },
  plugins: [],
}
