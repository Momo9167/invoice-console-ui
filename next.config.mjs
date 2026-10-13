/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:3200';

const nextConfig = {
  // The browser only talks to this app; /api/* is forwarded to invoice-service.
  // Same origin means the login cookie works without CORS.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};
export default nextConfig;
