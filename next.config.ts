import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/app", permanent: true },
      { source: "/dashboard/:path*", destination: "/app/:path*", permanent: true },
      { source: "/events", destination: "/app/events", permanent: true },
      { source: "/events/:path*", destination: "/app/events/:path*", permanent: true },
      { source: "/fighters", destination: "/app/fighters", permanent: true },
      { source: "/fighters/:slug([^/.]+)", destination: "/app/fighters/:slug", permanent: true },
      { source: "/fight/:path*", destination: "/app/fight/:path*", permanent: true },
      { source: "/compare", destination: "/app/compare", permanent: true },
      { source: "/pricing", destination: "/app/pricing", permanent: true },
      { source: "/account", destination: "/app/account", permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/portraits/espn/:id(\\d+).png",
        destination: "https://a.espncdn.com/i/headshots/mma/players/full/:id.png",
      },
    ];
  },
};

export default nextConfig;
