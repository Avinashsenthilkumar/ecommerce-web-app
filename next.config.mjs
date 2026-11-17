/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  webpack(config) {
    // The concatenation pass emits invalid module references for App Router API routes.
    config.optimization.concatenateModules = false;
    return config;
  },
};
export default nextConfig;
