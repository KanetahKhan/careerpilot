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
  // Point Turbopack at the correct root (avoids scanning parent dir with duplicate lockfile)
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';" }
      ]
    }];
  },
};
export default nextConfig;
