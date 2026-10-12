/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // The concatenation pass emits invalid module references for App Router API routes.
    config.optimization.concatenateModules = false;
    return config;
  },
};
export default nextConfig;
