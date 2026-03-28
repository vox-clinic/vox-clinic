import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Permissions-Policy', value: 'camera=(self https://*.daily.co), microphone=(self https://*.daily.co), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://connect.facebook.net",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev wss://*.supabase.co https://api.anthropic.com https://api.openai.com https://connect.facebook.net https://graph.facebook.com https://*.daily.co wss://*.daily.co https://api.nuvemfiscal.com.br https://api.sandbox.nuvemfiscal.com.br https://auth.nuvemfiscal.com.br",
            "frame-src https://accounts.google.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.facebook.com https://web.facebook.com https://*.daily.co",
            "media-src 'self' blob: https://*.supabase.co",
            "worker-src 'self' blob:",
          ].join('; ')
        },
      ],
    },
  ],
};

export default nextConfig;
