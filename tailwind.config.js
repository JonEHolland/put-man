/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Custom color palette for Put-Man
        sidebar: {
          DEFAULT: '#1e1e1e',
          hover: '#2d2d2d',
          active: '#37373d'
        },
        panel: {
          DEFAULT: '#252526',
          border: '#3c3c3c'
        },
        editor: {
          DEFAULT: '#1e1e1e'
        },
        accent: {
          DEFAULT: '#0078d4',
          hover: '#1084d8'
        }
      },
      fontFamily: {
        mono: ['Monaco', 'Menlo', 'Consolas', 'monospace']
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
