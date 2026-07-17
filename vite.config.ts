import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite's `base` must equal "/<repository-name>/" for GitHub project Pages.
// Configurable via VITE_BASE_PATH; falls back to inferring from GITHUB_REPOSITORY
// (set automatically inside GitHub Actions), then to the project's own default name.
function resolveBase(): string {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }
  const ghRepo = process.env.GITHUB_REPOSITORY; // "owner/repo-name"
  if (ghRepo && ghRepo.includes("/")) {
    const repoName = ghRepo.split("/")[1];
    if (repoName) return `/${repoName}/`;
  }
  return "/kalshi-crypto-vol-dashboard/";
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
