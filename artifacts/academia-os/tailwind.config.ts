import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        desk: {
          50: '#fbf8f2',
          100: '#f3eadb',
          200: '#e5cfad',
          300: '#d4ad77',
          400: '#bb8447',
          500: '#9f6631',
          600: '#805027',
          700: '#633e21',
          800: '#4a2f1d',
          900: '#342116'
        },
        chalk: {
          50: '#eef6f2',
          100: '#d6e9de',
          500: '#2f6d55',
          700: '#1f4f3d',
          900: '#173c30'
        }
      },
      boxShadow: {
        card: '0 12px 30px rgba(56, 35, 21, 0.10)'
      }
    }
  },
  plugins: []
};

export default config;
