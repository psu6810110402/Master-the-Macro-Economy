/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@hackanomics/ui", "@hackanomics/engine", "@hackanomics/database"],
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    // Recommending this for Vercel performance; linting should be a separate step
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
