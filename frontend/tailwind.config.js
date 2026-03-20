/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{vue,js,ts}", // Todas las carpetas dentro de frontend
    "./frontend/app.vue",
    "./frontend/error.vue",
  ],

  safelist: [
    // Gradientes y colores dinámicos
    { pattern: /(from|to|via)-(workplace-red|red|green|orange|yellow)(\/\d+)?/ },
    // Animaciones personalizadas
    { pattern: /animate-(float|pulse|bounce|pulse-glow|bounce-slow)/ },
    // Sombras, tarjetas, botones, badges, nav
    { pattern: /(shadow-glow|card|btn|badge|nav)-?.*/ },
    // Efectos de iconos y textos
    { pattern: /(icon|gradient|glass|premium|floating|glow)-?.*/ },
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
        secondary: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
        workplace: {
          red: '#ea1d2c', darkRed: '#c41e3a', orange: '#ff6900',
          yellow: '#ffb800', green: '#00d27a', gray: '#717171', lightGray: '#f5f5f5',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      boxShadow: {
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.25)',
        glow: '0 0 20px rgba(234, 29, 44, 0.3)',
        'glow-lg': '0 0 40px rgba(234, 29, 44, 0.4)',
      },
      backdropBlur: { xs: '2px' },
    },
  },

  plugins: [],
}