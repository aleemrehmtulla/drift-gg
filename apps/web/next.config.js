/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/shared"],
  async rewrites() {
    return [
      {
        source: "/c/:id",
        destination: "/play?challengeSourceId=:id",
      },
    ];
  },
};

module.exports = nextConfig;
