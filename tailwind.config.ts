/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        // New MediWyz brand palette
        'brand-navy': '#001E40',
        'brand-teal': '#0C6780',
        'brand-sky': '#9AE1FF',
        'brand-white': '#FFFFFF',
        // Semantic aliases
        'primary': '#001E40',
        'primary-blue': '#001E40',
        'primary-teal': '#0C6780',
        'secondary-green': '#0C6780',
        'highlight-yellow': '#9AE1FF',
      },
      // No gradient backgrounds — solid colors only from brand palette
      animation: {
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
}
