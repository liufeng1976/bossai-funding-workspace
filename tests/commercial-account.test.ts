import test from "node:test";
import assert from "node:assert/strict";
import {
  CommercialAccountError,
  confirmHeadquartersMfa,
  loginHeadquartersAccount,
  type CommercialAccountClientConfig,
} from "../src/server/commercial-account.ts";

const config: CommercialAccountClientConfig = {
  headquartersBaseUrl: "https://commerce.example.test",
  installationId: "bossai-funding-account-test-installation",
  productVersion: "0.50.0",
  timeoutMs: 5_000,
};
const password = "Strong-password-test-2026";
const sessionToken = `bossai_session_${"a".repeat(43)}`;
const mfaToken = `bossai_mfa_${"b".repeat(43)}`;

function successSessionEnvelope() {
  return {
    success: true,
    data: {
      account: {
        id: "account-test",
        tenantId: "tenant-test",
        displayName: "Owner",
      },
      entitlement: {
        authority: "bossai-headquarters-commerce",
      },
      expiresAt: "2026-09-20T00:00:00.000Z",
      sessionId: "session-test",
      sessionToken,
      refreshToken: `bossai_refresh_${"c".repeat(43)}`,
      refreshExpiresAt: "2026-11-20T00:00:00.000Z",
    },
  };
}

test("commercial account login sends only account and product/install identity and returns a bounded session", async () => {
  let requestUrl = "";
  let requestBody = null;
  const result = await loginHeadquartersAccount(config, { identifier: "Owner@Example.com", password }, async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify(successSessionEnvelope()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  assert.equal(requestUrl, "https://commerce.example.test/api/v1/auth/login");
  assert.deepEqual(requestBody, {
    identifier: "Owner@Example.com",
    password,
    deviceId: config.installationId,
    productId: "bossai-funding",
    productVersion: config.productVersion,
  });
  assert.equal(result.kind, "session");
  if (result.kind === "session") {
    assert.equal(result.sessionToken, sessionToken);
    assert.equal(result.accountId, "account-test");
    assert.equal(result.tenantId, "tenant-test");
  }
});

test("commercial account login keeps an MFA challenge in memory and confirmation returns the account session", async () => {
  const login = await loginHeadquartersAccount(config, { identifier: "+14155550100", password }, async () => new Response(JSON.stringify({
    success: true,
    data: {
      schemaVersion: "bossai.account-mfa-challenge.v1",
      mfaRequired: true,
      challengeId: "mfa-challenge-test",
      mfaChallengeToken: mfaToken,
      expiresAt: "2026-08-20T06:00:00.000Z",
      productId: "bossai-funding",
      deviceId: config.installationId,
    },
  }), { status: 202 }));

  assert.equal(login.kind, "mfa");
  assert.equal(login.kind === "mfa" ? login.mfaChallengeToken : "", mfaToken);

  let confirmBody = null;
  const confirmed = await confirmHeadquartersMfa(config, mfaToken, { code: "123456" }, async (_input, init) => {
    confirmBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify(successSessionEnvelope()), { status: 200 });
  });
  assert.deepEqual(confirmBody, { mfaChallengeToken: mfaToken, code: "123456" });
  assert.equal(confirmed.sessionToken, sessionToken);
});

test("commercial account MFA requires exactly one proof and supports a recovery code", async () => {
  await assert.rejects(
    () => confirmHeadquartersMfa(config, mfaToken, {}, async () => new Response("{}", { status: 200 })),
    (error: unknown) => error instanceof CommercialAccountError && error.code === "COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID",
  );
  await assert.rejects(
    () => confirmHeadquartersMfa(config, mfaToken, { code: "123456", recoveryCode: "recover-one" }, async () => new Response("{}", { status: 200 })),
    (error: unknown) => error instanceof CommercialAccountError && error.code === "COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID",
  );

  let confirmBody = null;
  const confirmed = await confirmHeadquartersMfa(config, mfaToken, { recoveryCode: "recover-one" }, async (_input, init) => {
    confirmBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify(successSessionEnvelope()), { status: 200 });
  });
  assert.deepEqual(confirmBody, { mfaChallengeToken: mfaToken, recoveryCode: "recover-one" });
  assert.equal(confirmed.sessionToken, sessionToken);
});

test("commercial account HTTP errors are enumeration-safe and never echo passwords or raw response text", async () => {
  const error = await loginHeadquartersAccount(config, { identifier: "owner@example.com", password }, async () => new Response(JSON.stringify({
    success: false,
    error: {
      code: "BOSSAI_ACCOUNT_UNAUTHORIZED",
      message: `server should not echo ${password}`,
    },
  }), { status: 401 })).then(
    () => null,
    (value: unknown) => value,
  );

  assert.ok(error instanceof CommercialAccountError);
  assert.equal(error.httpStatus, 401);
  assert.equal(error.headquartersCode, "BOSSAI_ACCOUNT_UNAUTHORIZED");
  assert.equal(error.message, "The BossAI account identifier or password is incorrect.");
  assert.equal(error.message.includes(password), false);
});

test("commercial account client rejects malformed session/challenge responses", async () => {
  await assert.rejects(
    () => loginHeadquartersAccount(config, { identifier: "owner@example.com", password }, async () => new Response(JSON.stringify({
      success: true,
      data: { sessionToken: "not-a-session" },
    }), { status: 200 })),
    (error: unknown) => error instanceof CommercialAccountError && error.code === "COMMERCIAL_ACCOUNT_RESPONSE_INVALID",
  );

  await assert.rejects(
    () => loginHeadquartersAccount(config, { identifier: "owner@example.com", password }, async () => new Response(JSON.stringify({
      success: true,
      data: { mfaRequired: true, mfaChallengeToken: "bad" },
    }), { status: 202 })),
    (error: unknown) => error instanceof CommercialAccountError && error.code === "COMMERCIAL_ACCOUNT_RESPONSE_INVALID",
  );
});
