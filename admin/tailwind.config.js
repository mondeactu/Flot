/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#2E7D32',
          800: '#1B5E20',
          900: '#0D3B11',
        },
        sidebar: {
          DEFAULT: '#191B25',
          hover: '#252733',
          active: '#2D3042',
          border: '#2D2F3D',
        },
        surface: {
          DEFAULT: '#F5F6FA',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#1A1D2B',
          secondary: '#6E7491',
          muted: '#A0A4B8',
          faint: '#C8CAD4',
        },
        border: {
          DEFAULT: '#E8E9EE',
          light: '#F0F1F5',
          input: '#DFE0E6',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'elevated': '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)',
        'modal': '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
