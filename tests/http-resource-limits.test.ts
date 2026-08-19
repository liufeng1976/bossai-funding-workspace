import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createConnection, type AddressInfo } from "node:net";
import { createFundingServer } from "../src/server/app.ts";
import { FundingRepository } from "../src/server/database.ts";
import {
  FUNDING_HTTP_RESOURCE_LIMITS,
  fundingHttpResourceLimitStatus,
} from "../src/server/http-resource-limits.ts";

test("funding HTTP server applies bounded request/header/keep-alive resources", () => {
  const repo = new FundingRepository(":memory:");
  try {
    const server = createFundingServer(repo, resolve(process.cwd(), "public"));
    assert.equal(server.headersTimeout, FUNDING_HTTP_RESOURCE_LIMITS.headersTimeoutMs);
    assert.equal(server.requestTimeout, FUNDING_HTTP_RESOURCE_LIMITS.requestTimeoutMs);
    assert.equal(server.keepAliveTimeout, FUNDING_HTTP_RESOURCE_LIMITS.keepAliveTimeoutMs);
    assert.equal(server.maxHeadersCount, FUNDING_HTTP_RESOURCE_LIMITS.maxHeaderCount);
    assert.equal(server.maxRequestsPerSocket, FUNDING_HTTP_RESOURCE_LIMITS.maxRequestsPerSocket);

    const status = fundingHttpResourceLimitStatus();
    assert.equal(status.ready, true);
    assert.equal(status.maxHeaderSizeBytes, 16 * 1024);
    assert.equal(status.maxJsonBodyBytes, 1_000_000);
  } finally {
    repo.close();
  }
});

test("oversized raw HTTP headers are rejected by the Node parser before application routing", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  try {
    const response = await new Promise<string>((resolveResponse, rejectResponse) => {
      const socket = createConnection({ host: "127.0.0.1", port: address.port }, () => {
        socket.write(
          `GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:${address.port}\r\nX-Oversized: ${"x".repeat(FUNDING_HTTP_RESOURCE_LIMITS.maxHeaderSizeBytes + 1024)}\r\n\r\n`,
        );
      });
      let data = "";
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => { data += chunk; });
      socket.on("end", () => resolveResponse(data));
      socket.on("error", rejectResponse);
    });
    assert.match(response, /^HTTP\/1\.1 431 /);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});

test("oversized financing JSON is rejected with 413 before persistence", async () => {
  const repo = new FundingRepository(":memory:");
  const server = createFundingServer(repo, resolve(process.cwd(), "public"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/company-profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: "x".repeat(FUNDING_HTTP_RESOURCE_LIMITS.maxJsonBodyBytes + 1) }),
    });
    assert.equal(response.status, 413);
    const body = await response.json() as { code?: string };
    assert.equal(body.code, "REQUEST_TOO_LARGE");
    assert.equal(repo.getCompanyProfile(), null);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    repo.close();
  }
});
