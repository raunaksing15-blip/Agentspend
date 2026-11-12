
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: {
    'as-bg': '#0B0F19', 'as-panel': '#111827', 'as-blue': '#00E5FF',
    'as-yellow': '#FBBF24', 'as-green': '#10B981', 'as-red': '#EF4444'
  }, fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] } } },
  plugins: []
};
export default config;
