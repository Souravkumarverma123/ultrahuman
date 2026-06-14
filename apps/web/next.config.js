/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: "http://localhost:8000/trpc/:path*",
      },
      {
        source: "/events/corsair",
        destination: "http://localhost:8000/events/corsair",
      },
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:8000/api/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
