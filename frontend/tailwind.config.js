/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    'text-blue-200',
    'text-red-500',
    'text-green-400',
    'text-yellow-400',
    'text-purple-400',
    'text-gray-400',
    'text-white',
    'text-black',
    'bg-blue-500',
    'bg-red-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-gray-500',
    'font-bold',
    'font-semibold',
    'italic',
    'underline',
    'line-through',
    'text-sm',
    'text-xs',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-base'
  ],
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          to: { 'background-position': '200% center' },
        }
      }
    },
  },
  plugins: [],
}
