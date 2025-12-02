/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Midnight Magic Theme
                'neon-pink': '#D53F8C',
                'electric-purple': '#805AD5',
                'teal-accent': '#38B2AC',
                'deep-gray-blue': '#1A202C',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
