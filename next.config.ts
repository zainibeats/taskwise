import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Add API route rewrites to handle relative paths
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/:path*` : 'http://localhost:3100/api/:path*',
      },
    ];
  },
  
  // Prevent Node.js-specific modules from being bundled on the client side
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle Node.js-specific modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js core modules
        'async_hooks': false,
        'fs': false,
        'fs/promises': false,
        'http2': false,
        'net': false,
        'tls': false,
        'dns': false,
        'path': false,
        'os': false,
        'stream': false,
        'zlib': false,
        'crypto': false,
        'url': false,
        'util': false,
        'events': false,
        'http': false,
        'buffer': false,
        'child_process': false,
      };

      // Handle Node.js-specific packages
      config.resolve.alias = {
        ...config.resolve.alias,
        // OpenTelemetry packages
        '@opentelemetry/api': false,
        '@opentelemetry/core': false,
        '@opentelemetry/sdk-trace-node': false,
        '@opentelemetry/sdk-trace-base': false,
        '@opentelemetry/context-async-hooks': false,
        '@opentelemetry/propagator-b3': false,
        '@opentelemetry/instrumentation': false,
        '@opentelemetry/semantic-conventions': false,
        '@opentelemetry/otlp-grpc-exporter-base': false,
        
        // Express related
        'express': false,
        'get-port': false,
        'accepts': false,
        'depd': false,
        'type-is': false,
        'fresh': false,
        'mime': false,
        'send': false,
        'destroy': false,
        'etag': false,
        'on-finished': false,
        
        // gRPC related
        '@grpc/grpc-js': false,
        '@grpc/proto-loader': false,
        
        // Google AI related
        '@google/generative-ai': false,
        '@genkit-ai/ai': false,
        '@genkit-ai/core': false,
      };
      
      // Handle all OpenTelemetry packages and their dependencies
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      
      // Rule for OpenTelemetry packages
      config.module.rules.push({
        test: /node_modules\/@opentelemetry\/.*/,
        use: 'null-loader',
      });

      // Rule for gRPC packages
      config.module.rules.push({
        test: /node_modules\/@grpc\/.*/,
        use: 'null-loader',
      });

      // Rule for Genkit packages
      config.module.rules.push({
        test: /node_modules\/@genkit-ai\/.*/,
        use: 'null-loader',
      });
    }
    return config;
  },
};

export default nextConfig;
