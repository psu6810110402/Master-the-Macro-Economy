/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@hackanomics/ui", "@hackanomics/engine", "@hackanomics/database"],
  reactStrictMode: true,
};

export default nextConfig;
