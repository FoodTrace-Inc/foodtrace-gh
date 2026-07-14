import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project under /foodtrace-gh/, not the domain
  // root — GITHUB_PAGES is only set by the deploy workflow, so local dev
  // and any other host still get base "/".
  base: process.env.GITHUB_PAGES ? "/foodtrace-gh/" : "/",
});

