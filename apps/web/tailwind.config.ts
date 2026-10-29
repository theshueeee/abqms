import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#173d35",
          dark: "#102e28",
          pale: "#eaf4e5",
          lime: "#cfff72",
        },
      },
      boxShadow: {
        card: "0 18px 50px rgba(24, 33, 31, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
