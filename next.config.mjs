/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Permite importar CSVs maiores no fluxo da tela /forms/import-leads.
    middlewareClientMaxBodySize: '25mb',
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  transpilePackages: ['leaflet', 'react-leaflet'],
  images: {
    unoptimized: true, // Mantém sua configuração atual
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.casa63.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Autoriza qualquer projeto do Supabase (Storage)
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig