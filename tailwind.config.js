/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          brown: "#8B5A2B",
          brownLight: "#A67B5B",
          green: "#5D7B56",
          greenLight: "#7A9A73",
          cream: "#FFF9F0",
          beige: "#F5F0E8",
          orange: "#D4845E",
          sage: "#C8D8C5",
          taupe: "#8B7E6B",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(139, 90, 43, 0.08)",
        card: "0 4px 20px rgba(139, 90, 43, 0.1)",
        modal: "0 20px 60px rgba(0, 0, 0, 0.15)",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
