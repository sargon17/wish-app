/** @type {import('next').NextConfig} */

// eslint-disable-next-line ts/no-require-imports
require('dotenv').config()

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    reactCompiler: true,
  },
}

module.exports = nextConfig
