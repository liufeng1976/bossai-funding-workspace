export const FUNDING_COMMERCIAL_PRODUCT_ID = "bossai-funding";
export const FUNDING_COMMERCIAL_FEATURE_ID = "bossai-funding.commercial";
export const HEADQUARTERS_ENTITLEMENT_SCHEMA = "bossai.commercial-entitlement.v1";

export type FundingDistributionMode = "community" | "commercial";

export interface FundingDistributionConfig {
  mode: FundingDistributionMode;
  productId: typeof FUNDING_COMMERCIAL_PRODUCT_ID;
  productVersion: string;
  installationId: string | null;
  headquartersBaseUrl: string | null;
  bearerToken: string | null;
  timeoutMs: number;
}

export interface FundingDistributionAuthorization {
  mode: FundingDistributionMode;
  checked: boolean;
  authorized: true;
  authority: "community-agpl" | "bossai-headquarters-commerce";
  schemaVersion: "community" | typeof HEADQUARTERS_ENTITLEMENT_SCHEMA;
  entitlementRevision: string | null;
  accessReason: "COMMUNITY_AGPL" | "AUTHORIZED";
  membershipStatus: string | null;
  planCode: string | null;
  expiresAt: string | null;
}

export class CommercialEntitlementError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;

  constructor(code: string, message: string, options: { httpStatus?: number | null } = {}) {
    super(message);
    this.name = "CommercialEntitlementError";
    this.code = code;
    this.httpStatus = options.httpStatus ?? null;
  }
}

interface ResolveFundingDistributionConfigOptions {
  productVersion: string;
  installationId?: string | null;
  env?: NodeJS.ProcessEnv;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireSafeIdentifier(value: string | undefined | null, field: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_MISSING", `${field} is required.`);
  }
  if (normalized.length > 200 || /[\u0000-\u001f\u007f\s]/u.test(normalized)) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INVALID", `${field} must be a bounded identifier.`);
  }
  return normalized;
}

function requireProductVersion(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 80 || !/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/u.test(normalized)) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INVALID", "BossAI Funding product version is invalid.");
  }
  return normalized;
}

function normalizeHeadquartersBaseUrl(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_MISSING", "BossAI Headquarters Commerce base URL is required in commercial distribution mode.");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INVALID", "BossAI Headquarters Commerce base URL is invalid.");
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INVALID", "BossAI Headquarters Commerce base URL must not contain credentials, query parameters, or fragments.");
  }

  const loopbackHost = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "[::1]";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopbackHost)) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INSECURE", "Commercial entitlement requires HTTPS except for an explicit loopback development endpoint.");
  }

  return parsed.origin;
}

function resolveTimeoutMs(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return 5_000;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 500 || parsed > 30_000) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INVALID", "Commercial entitlement timeout must be an integer between 500 and 30000 milliseconds.");
  }
  return parsed;
}

export function resolveFundingDistributionConfig(options: ResolveFundingDistributionConfigOptions): FundingDistributionConfig {
  const env = options.env ?? process.env;
  const productVersion = requireProductVersion(options.productVersion);
  const modeRaw = String(env.BOSSAI_FUNDING_DISTRIBUTION ?? "community").trim().toLowerCase();
  if (modeRaw !== "community" && modeRaw !== "commercial") {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_INVALID", "BOSSAI_FUNDING_DISTRIBUTION must be community or commercial.");
  }

  if (modeRaw === "community") {
    return {
      mode: "community",
      productId: FUNDING_COMMERCIAL_PRODUCT_ID,
      productVersion,
      installationId: null,
      headquartersBaseUrl: null,
      bearerToken: null,
      timeoutMs: resolveTimeoutMs(env.BOSSAI_FUNDING_HEADQUARTERS_TIMEOUT_MS),
    };
  }

  const rawBearerToken = String(env.BOSSAI_FUNDING_HEADQUARTERS_BEARER_TOKEN ?? "").trim();
  const bearerToken = rawBearerToken
    ? requireSafeIdentifier(rawBearerToken, "BossAI Headquarters Commerce bearer token")
    : null;
  const installationId = requireSafeIdentifier(options.installationId ?? env.BOSSAI_FUNDING_INSTALLATION_ID, "BossAI Funding installation ID");

  return {
    mode: "commercial",
    productId: FUNDING_COMMERCIAL_PRODUCT_ID,
    productVersion,
    installationId,
    headquartersBaseUrl: normalizeHeadquartersBaseUrl(env.BOSSAI_FUNDING_HEADQUARTERS_BASE_URL),
    bearerToken,
    timeoutMs: resolveTimeoutMs(env.BOSSAI_FUNDING_HEADQUARTERS_TIMEOUT_MS),
  };
}

function safeAccessReason(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9_]{1,80}$/u.test(normalized) ? normalized : "UNAUTHORIZED";
}

function requireEntitlementEnvelope(value: unknown, config: FundingDistributionConfig): FundingDistributionAuthorization {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_INVALID", "BossAI Headquarters Commerce returned an invalid entitlement envelope.");
  }

  const data = value.data;
  if (data.schemaVersion !== HEADQUARTERS_ENTITLEMENT_SCHEMA) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_SCHEMA_MISMATCH", "BossAI Headquarters Commerce entitlement schema is not supported.");
  }
  if (!isRecord(data.product) || data.product.id !== config.productId || data.product.version !== config.productVersion) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_PRODUCT_MISMATCH", "BossAI Headquarters Commerce entitlement does not match this BossAI Funding product/version.");
  }
  if (!isRecord(data.device) || data.device.id !== config.installationId) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_DEVICE_MISMATCH", "BossAI Headquarters Commerce entitlement does not match this installation.");
  }
  if (!isRecord(data.headquartersCommerce)
    || data.headquartersCommerce.authority !== "bossai-headquarters-commerce"
    || data.headquartersCommerce.controlsBusinessExecution !== false
    || data.headquartersCommerce.routesProviders !== false
    || data.headquartersCommerce.acceptsCustomerBusinessContent !== false
    || data.headquartersCommerce.remoteBusinessActionsAllowed !== false) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_AUTHORITY_INVALID", "Commercial entitlement response violates the BossAI authority boundary.");
  }
  if (!isRecord(data.entitlement)) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_INVALID", "BossAI Headquarters Commerce entitlement payload is missing.");
  }

  const accessReason = safeAccessReason(data.entitlement.accessReason);
  const licenseActive = data.entitlement.licenseActive === true;
  const membershipStatus = typeof data.entitlement.membershipStatus === "string" ? data.entitlement.membershipStatus : null;
  if (!licenseActive || membershipStatus !== "active" || accessReason !== "AUTHORIZED") {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_DENIED", `BossAI commercial entitlement denied: ${accessReason}.`);
  }
  const features = Array.isArray(data.entitlement.features)
    ? data.entitlement.features.filter((item): item is string => typeof item === "string")
    : [];
  if (!features.includes(FUNDING_COMMERCIAL_FEATURE_ID)) {
    throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_FEATURE_REQUIRED", `BossAI commercial entitlement does not include ${FUNDING_COMMERCIAL_FEATURE_ID}.`);
  }

  return {
    mode: "commercial",
    checked: true,
    authorized: true,
    authority: "bossai-headquarters-commerce",
    schemaVersion: HEADQUARTERS_ENTITLEMENT_SCHEMA,
    entitlementRevision: typeof data.entitlementRevision === "string" ? data.entitlementRevision : null,
    accessReason: "AUTHORIZED",
    membershipStatus,
    planCode: typeof data.entitlement.planCode === "string" ? data.entitlement.planCode : null,
    expiresAt: typeof data.entitlement.expiresAt === "string" ? data.entitlement.expiresAt : null,
  };
}

export async function verifyFundingDistributionAuthorization(
  config: FundingDistributionConfig,
  fetchImpl: FetchLike = fetch,
): Promise<FundingDistributionAuthorization> {
  if (config.mode === "community") {
    return {
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
    };
  }

  if (!config.headquartersBaseUrl || !config.bearerToken || !config.installationId) {
    throw new CommercialEntitlementError("COMMERCIAL_CONFIG_MISSING", "Commercial distribution configuration is incomplete.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetchImpl(`${config.headquartersBaseUrl}/api/v1/commerce/entitlement`, {
        method: "GET",
        redirect: "error",
        cache: "no-store",
        headers: {
          authorization: `Bearer ${config.bearerToken}`,
          "x-bossai-product-id": config.productId,
          "x-bossai-installation-id": config.installationId,
          "x-bossai-product-version": config.productVersion,
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_TIMEOUT", "BossAI Headquarters Commerce entitlement check timed out.");
      }
      throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_UNAVAILABLE", "BossAI Headquarters Commerce entitlement check is unavailable.");
    }

    if (!response.ok) {
      throw new CommercialEntitlementError(
        "COMMERCIAL_ENTITLEMENT_HTTP_ERROR",
        `BossAI Headquarters Commerce entitlement request failed with HTTP ${response.status}.`,
        { httpStatus: response.status },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new CommercialEntitlementError("COMMERCIAL_ENTITLEMENT_INVALID", "BossAI Headquarters Commerce entitlement response was not valid JSON.");
    }
    return requireEntitlementEnvelope(payload, config);
  } finally {
    clearTimeout(timer);
  }
}
