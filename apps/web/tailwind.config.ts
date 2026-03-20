import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)', // Impeccable requirement
      },
      fontFamily: {
        sans: ['var(--font-murecho)', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      }
    },
  },
  plugins: [],
};

export default config;
