const API_URL = process.env.API_URL || "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: `${API_URL}/trpc/:path*`,
      },
      {
        source: "/events/corsair",
        destination: `${API_URL}/events/corsair`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${API_URL}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
