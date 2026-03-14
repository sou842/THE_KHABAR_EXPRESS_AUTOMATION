export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        "slate-bg": "#0f172a",
        "slate-panel": "#1e293b",
        "neon-green": "#39ff14",
        "neon-dim": "#064e3b",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"]
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
};
