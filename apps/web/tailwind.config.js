/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          5:   'rgb(var(--primary) / 0.05)',
          10:  'rgb(var(--primary) / 0.10)',
          20:  'rgb(var(--primary) / 0.20)',
          50:  'rgb(var(--primary) / 0.50)',
          70:  'rgb(var(--primary) / 0.70)',
          80:  'rgb(var(--primary) / 0.80)',
          90:  'rgb(var(--primary) / 0.90)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          5:   'rgb(var(--accent) / 0.05)',
          10:  'rgb(var(--accent) / 0.10)',
          50:  'rgb(var(--accent) / 0.50)',
          80:  'rgb(var(--accent) / 0.80)',
          90:  'rgb(var(--accent) / 0.90)',
        },
        'header-bg': 'rgb(var(--header-bg) / <alpha-value>)',
        'footer-bg': 'rgb(var(--footer-bg) / <alpha-value>)',
      },
      fontFamily: {
        sans:    ['var(--font-sans)',    'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Poppins', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        'card':      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md':   '0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-lg':   '0 10px 20px -4px rgb(0 0 0 / 0.09), 0 4px 8px -4px rgb(0 0 0 / 0.05)',
        'card-xl':   '0 20px 40px -8px rgb(0 0 0 / 0.12), 0 8px 16px -6px rgb(0 0 0 / 0.07)',
        'card-hover':'0 14px 30px -6px rgb(0 0 0 / 0.13), 0 5px 12px -5px rgb(0 0 0 / 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        'bounce-sm': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.4s ease-out both',
        'slide-in': 'slide-in 0.3s ease-out both',
        shimmer:    'shimmer 1.6s linear infinite',
        marquee:    'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
