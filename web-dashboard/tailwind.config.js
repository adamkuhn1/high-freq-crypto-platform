/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bloomberg': {
          'bg': '#121212',
          'panel': '#1e1e1e',
          'border': '#333333',
          'text': '#e0e0e0',
          'text-dim': '#888888',
          'green': '#00ff41',
          'red': '#ff3b30',
        },
      },
      fontFamily: {
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

