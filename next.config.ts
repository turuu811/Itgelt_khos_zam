import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Docker/VPS дээр байршуулахад хялбар
  output: 'standalone',
  experimental: {
    serverActions: { bodySizeLimit: '11mb' },
  },
};

export default withNextIntl(nextConfig);
