/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            fontWeight: {
                normal: '400',
                medium: '500',
                bold: '700',
            },
            keyframes: {
                'fade-in': {
                    'from': { opacity: '0', transform: 'translateY(-10px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-in': {
                    'from': { opacity: '0', transform: 'translateX(-20px)' },
                    'to': { opacity: '1', transform: 'translateX(0)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out forwards',
                'slide-in': 'slide-in 0.4s ease-out forwards',
                'pulse-glow': 'pulse-glow 2s infinite',
            },
        },
    },
    plugins: [],
}
