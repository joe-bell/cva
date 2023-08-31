import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import starlightPlugin from "@astrojs/starlight-tailwind";

export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        accent: colors.zinc,
        gray: colors.zinc,
      },
      fontFamily: {
        sans: [
          'Inter, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        ],
      },
    },
  },
  plugins: [starlightPlugin()],
} satisfies Config;
