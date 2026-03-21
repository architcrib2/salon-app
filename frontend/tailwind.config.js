/** @file Tailwind configuration with salon brand colours */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#1a1a2e',
        accent: '#e94560',
        'accent-dark': '#c73652',
      },
    },
  },
  plugins: [],
}
