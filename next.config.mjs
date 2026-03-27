/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Allows the physical /secret-admin folder to be served at the dynamic ADMIN_URL_PATH defined in .env
    const adminPath = process.env.ADMIN_URL_PATH || '/secret-admin';

    // If the path is already exactly /secret-admin, no rewrite needed to avoid circular logic
    if (adminPath === '/secret-admin') {
      return [];
    }

    return [
      {
        source: adminPath,
        destination: '/secret-admin',
      },
      {
        source: `${adminPath}/:path*`,
        destination: '/secret-admin/:path*',
      },
    ];
  },
};

export default nextConfig;
