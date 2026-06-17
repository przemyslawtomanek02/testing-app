// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    darkMode: 'class',
    theme: {},
    // variants: {
    //   extend: {
    //     backgroundColor: ['checked'],
    //     borderColor: ['checked'],
    //     before: ['checked'],
    //     transform: ['checked'],
    //     translate: ['checked'],
    //     content: ['checked'],
    //   },
    // },
    plugins: [
        require('@tailwindcss/line-clamp'),
    ],
}
