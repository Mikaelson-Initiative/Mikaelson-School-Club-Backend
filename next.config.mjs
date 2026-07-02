/** @type {import('next').NextConfig} */
const config = {
  // ── Image optimisation ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Vercel Blob storage (for uploaded avatars and blog images)
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
      // Cloudinary fallback (if you switch storage providers)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Google profile photos (Firebase Google Sign-In)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // ── Request body size limits ───────────────────────────────────────────────
  // Default Next.js limit is 4 MB. Blog content with base64 images needs more;
  // but we cap it to prevent abuse. Upload endpoint handles files separately.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // ── Security headers on every response ────────────────────────────────────
  // These complement the headers set in middleware.ts.
  // Middleware handles per-request; next.config handles static + fallback.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // Content Security Policy
          // Tighten these once you know all your third-party sources
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com https://res.cloudinary.com https://unpkg.com",
              "font-src 'self'",
              "connect-src 'self' https://*.upstash.io https://firebaseapp.com https://*.firebaseio.com https://securetoken.googleapis.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // Enforce CORS on all API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGINS || "*", // Vercel environment variable
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PATCH, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
      // Never cache admin/authenticated responses. Public read routes
      // (e.g. /api/stats, /api/team) set their own cache headers.
      {
        source: "/api/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // ── Redirect HTTP → HTTPS in production ───────────────────────────────────
  async redirects() {
    return [];
  },

  // ── PoweredBy header removal ───────────────────────────────────────────────
  poweredByHeader: false,

  // ── TypeScript & ESLint in production builds ──────────────────────────────
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default config;
