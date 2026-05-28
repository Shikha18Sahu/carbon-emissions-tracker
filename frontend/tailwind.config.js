/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          bg: '#0a0f0a',      // Near-black with subtle green tint
          base: '#1a3a2a',    // Deep forest green
          accent: '#00f5d4',  // Bioluminescent cyan
          approved: '#10b981',// Mint green
          flagged: '#f59e0b', // Warm amber
          rejected: '#ef4444',// Coral red
          card: '#0f1710',    // Dark card background
          border: '#1b2b1d',  // Subtle green border
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breath': 'breath 4s ease-in-out infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.9 },
          '50%': { transform: 'scale(1.05)', opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
