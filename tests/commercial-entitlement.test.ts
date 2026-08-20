import test from "node:test";
import assert from "node:assert/strict";
import {
  CommercialEntitlementError,
  FUNDING_COMMERCIAL_FEATURE_ID,
  FUNDING_COMMERCIAL_PRODUCT_ID,
  HEADQUARTERS_ENTITLEMENT_SCHEMA,
  resolveFundingDistributionConfig,
  verifyFundingDistributionAuthorization,
} from "../src/server/commercial-entitlement.ts";

const VERSION = "0.51.0";
const INSTALLATION = "bossai-funding-test-installation";
const TOKEN = "bossai_session_test_token_123456";

function commercialEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    BOSSAI_FUNDING_DISTRIBUTION: "commercial",
    BOSSAI_FUNDING_HEADQUARTERS_BASE_URL: "https://commerce.example.test",
    BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN: TOKEN,
    BOSSAI_FUNDING_INSTALLATION_ID: INSTALLATION,
    ...overrides,
  };
}

function entitlementEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    success: true,
    data: {
      schemaVersion: HEADQUARTERS_ENTITLEMENT_SCHEMA,
      generatedAt: "2026-08-20T05:00:00.000Z",
      diagnosticId: "hq-commerce-test",
      entitlementRevision: "hq-commerce-2026-08-20",
      tenant: { id: "tenant-test", name: "Test Tenant", plan: "commercial" },
      product: { id: FUNDING_COMMERCIAL_PRODUCT_ID, version: VERSION },
      device: { id: INSTALLATION, registered: true, lastSeenAt: "2026-08-20T05:00:00.000Z" },
      headquartersCommerce: {
        authority: "bossai-headquarters-commerce",
        manages: ["commercial-account-and-tenant", "membership-plan-and-license"],
        controlsBusinessExecution: false,
        controlsLocalUsers: false,
        controlsLocalRoles: false,
        controlsLocalWorkflows: false,
        routesProviders: false,
        invokesProviders: false,
        acceptsCustomerBusinessContent: false,
        remoteBusinessActionsAllowed: false,
      },
      entitlement: {
        licenseActive: true,
        canUseLocalBusinessProduct: true,
        accessReason: "AUTHORIZED",
        planCode: "commercial",
        planName: "Commercial",
        membershipStatus: "active",
        features: [FUNDING_COMMERCIAL_FEATURE_ID],
        expiresAt: null,
        offlineGraceUntil: null,
      },
      localBusinessExecution: {
        authority: "customer-local",
        headquartersRemoteBusinessControl: false,
      },
      ...overrides,
    },
  };
}

test("community distribution is authorized locally and never calls Headquarters Commerce", async () => {
  const config = resolveFundingDistributionConfig({ productVersion: VERSION, env: {} });
  assert.equal(config.mode, "community");
  assert.equal(config.headquartersBaseUrl, null);
  assert.equal(config.bearerToken, null);

  let called = false;
  const result = await verifyFundingDistributionAuthorization(config, async () => {
    called = true;
    throw new Error("community mode must not call fetch");
  });

  assert.equal(called, false);
  assert.deepEqual(result, {
    mode: "community",
    checked: false,
    authorized: true,
    authority: "community-agpl",
    schemaVersion: "community",
    entitlementRevision: null,
    accessReason: "COMMUNITY_AGPL",
    membershipStatus: null,
    planCode: null,
    expiresAt: null,
  });
});

test("commercial distribution sends the canonical Headquarters entitlement request and accepts only matching authority", async () => {
  const config = resolveFundingDistributionConfig({ productVersion: VERSION, env: commercialEnv() });
  assert.equal(config.mode, "commercial");

  let requestUrl = "";
  let requestHeaders = new Headers();
  const result = await verifyFundingDistributionAuthorization(config, async (input, init) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify(entitlementEnvelope()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  assert.equal(requestUrl, "https://commerce.example.test/api/v1/commerce/entitlement");
  assert.equal(requestHeaders.get("authorization"), `Bearer ${TOKEN}`);
  assert.equal(requestHeaders.get("x-bossai-product-id"), FUNDING_COMMERCIAL_PRODUCT_ID);
  assert.equal(requestHeaders.get("x-bossai-installation-id"), INSTALLATION);
  assert.equal(requestHeaders.get("x-bossai-product-version"), VERSION);
  assert.equal(result.authority, "bossai-headquarters-commerce");
  assert.equal(result.accessReason, "AUTHORIZED");
  assert.equal(result.planCode, "commercial");
});

test("commercial distribution resolves without an injected bearer for desktop sign-in but verifier still fails closed without a session", async () => {
  const config = resolveFundingDistributionConfig({
    productVersion: VERSION,
    env: {
      BOSSAI_FUNDING_DISTRIBUTION: "commercial",
      BOSSAI_FUNDING_HEADQUARTERS_BASE_URL: "https://commerce.example.test",
      BOSSAI_FUNDING_INSTALLATION_ID: INSTALLATION,
    },
  });
  assert.equal(config.mode, "commercial");
  assert.equal(config.bearerToken, null);
  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_CONFIG_MISSING",
  );
});

test("commercial distribution fails closed when required non-session configuration is missing or transport is insecure", () => {
  assert.throws(
    () => resolveFundingDistributionConfig({ productVersion: VERSION, env: { BOSSAI_FUNDING_DISTRIBUTION: "commercial" } }),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_CONFIG_MISSING",
  );

  assert.throws(
    () => resolveFundingDistributionConfig({
      productVersion: VERSION,
      env: commercialEnv({ BOSSAI_FUNDING_HEADQUARTERS_BASE_URL: "http://commerce.example.test" }),
    }),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_CONFIG_INSECURE",
  );

  const loopback = resolveFundingDistributionConfig({
    productVersion: VERSION,
    env: commercialEnv({ BOSSAI_FUNDING_HEADQUARTERS_BASE_URL: "http://127.0.0.1:4319" }),
  });
  assert.equal(loopback.headquartersBaseUrl, "http://127.0.0.1:4319");
});

test("commercial distribution rejects inactive licensing, mismatched product/device and authority expansion", async () => {
  const config = resolveFundingDistributionConfig({ productVersion: VERSION, env: commercialEnv() });

  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config, async () => new Response(JSON.stringify(entitlementEnvelope({
      entitlement: {
        licenseActive: false,
        membershipStatus: "active",
        accessReason: "LICENSE_SUSPENDED",
      },
    })), { status: 200 })),
    (error: unknown) => error instanceof CommercialEntitlementError
      && error.code === "COMMERCIAL_ENTITLEMENT_DENIED"
      && /LICENSE_SUSPENDED/u.test(error.message)
      && !error.message.includes(TOKEN),
  );

  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config, async () => new Response(JSON.stringify(entitlementEnvelope({
      product: { id: "another-product", version: VERSION },
    })), { status: 200 })),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_ENTITLEMENT_PRODUCT_MISMATCH",
  );

  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config, async () => new Response(JSON.stringify(entitlementEnvelope({
      device: { id: "another-installation" },
    })), { status: 200 })),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_ENTITLEMENT_DEVICE_MISMATCH",
  );

  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config, async () => new Response(JSON.stringify(entitlementEnvelope({
      headquartersCommerce: {
        authority: "bossai-headquarters-commerce",
        controlsBusinessExecution: true,
        routesProviders: false,
        acceptsCustomerBusinessContent: false,
        remoteBusinessActionsAllowed: false,
      },
    })), { status: 200 })),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_ENTITLEMENT_AUTHORITY_INVALID",
  );

  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config, async () => new Response(JSON.stringify(entitlementEnvelope({
      entitlement: {
        licenseActive: true,
        membershipStatus: "active",
        accessReason: "AUTHORIZED",
        features: [],
      },
    })), { status: 200 })),
    (error: unknown) => error instanceof CommercialEntitlementError && error.code === "COMMERCIAL_ENTITLEMENT_FEATURE_REQUIRED",
  );
});

test("commercial distribution maps Headquarters transport failure without exposing bearer material", async () => {
  const config = resolveFundingDistributionConfig({ productVersion: VERSION, env: commercialEnv() });
  await assert.rejects(
    () => verifyFundingDistributionAuthorization(config, async () => new Response("forbidden", { status: 403 })),
    (error: unknown) => error instanceof CommercialEntitlementError
      && error.code === "COMMERCIAL_ENTITLEMENT_HTTP_ERROR"
      && !error.message.includes(TOKEN),
  );
});
