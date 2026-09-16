/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: ['md:flex', 'md:relative'],
  theme: {
    extend: {
      colors: {
        parchment: '#FBF9F5',
        espresso: '#1C1917',
        editorialBorder: '#E5E0D8',
        accentRust: '#C85A32',
        // Map the sidebar variables so AppSidebarShell renders properly
        sidebar: {
          DEFAULT: '#FBF9F5',
          foreground: '#1C1917',
          border: '#E5E0D8',
          accent: '#E5E0D8',
        },
      },
    },
  },
  plugins: [],
}