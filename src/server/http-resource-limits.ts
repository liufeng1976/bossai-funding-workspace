import { createServer, type RequestListener, type Server } from "node:http";

export const FUNDING_HTTP_RESOURCE_LIMITS = Object.freeze({
  maxHeaderSizeBytes: 16 * 1024,
  maxHeaderCount: 100,
  headersTimeoutMs: 10_000,
  requestTimeoutMs: 30_000,
  keepAliveTimeoutMs: 5_000,
  maxRequestsPerSocket: 100,
  maxJsonBodyBytes: 1_000_000,
});

export interface FundingHttpResourceLimitProjection {
  ready: true;
  maxHeaderSizeBytes: number;
  maxHeaderCount: number;
  headersTimeoutMs: number;
  requestTimeoutMs: number;
  keepAliveTimeoutMs: number;
  maxRequestsPerSocket: number;
  maxJsonBodyBytes: number;
}

export function fundingHttpResourceLimitStatus(): FundingHttpResourceLimitProjection {
  return {
    ready: true,
    ...FUNDING_HTTP_RESOURCE_LIMITS,
  };
}

export function createFundingHttpServer(listener: RequestListener): Server {
  const server = createServer(
    {
      maxHeaderSize: FUNDING_HTTP_RESOURCE_LIMITS.maxHeaderSizeBytes,
      headersTimeout: FUNDING_HTTP_RESOURCE_LIMITS.headersTimeoutMs,
      requestTimeout: FUNDING_HTTP_RESOURCE_LIMITS.requestTimeoutMs,
      keepAliveTimeout: FUNDING_HTTP_RESOURCE_LIMITS.keepAliveTimeoutMs,
    },
    listener,
  );
  server.maxHeadersCount = FUNDING_HTTP_RESOURCE_LIMITS.maxHeaderCount;
  server.maxRequestsPerSocket = FUNDING_HTTP_RESOURCE_LIMITS.maxRequestsPerSocket;
  return server;
}
