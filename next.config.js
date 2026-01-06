/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Allow cross-origin requests from Same preview domains
  allowedDevOrigins: [
    'https://*.preview.same-app.com',
    'https://*.same-app.com',
  ],
};

module.exports = nextConfig;
