/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fdf3f0',
                    100: '#fae3dc',
                    200: '#f4cabd',
                    300: '#eba894',
                    400: '#df7c60',
                    500: '#d75836',
                    600: '#c24222',
                    700: '#a3341b',
                    800: '#862d18',
                    900: '#6e2716',
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
