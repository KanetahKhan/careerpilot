/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse and mammoth are server-only; keep them out of the client bundle.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};
export default nextConfig;
