/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f4',
          100: '#ffe0e7',
          200: '#ffc6d2',
          300: '#ff9db1',
          400: '#ff6689',
          500: '#ff3366',
          600: '#ed1757',
          700: '#c80d4a',
          800: '#a40e44',
          900: '#880e3f',
        },
        accent: {
          400: '#ffc857',
          500: '#ffb020',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
