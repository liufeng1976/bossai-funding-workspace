import { FUNDING_COMMERCIAL_PRODUCT_ID } from "./commercial-entitlement.ts";

export interface CommercialAccountClientConfig {
  headquartersBaseUrl: string;
  installationId: string;
  productVersion: string;
  timeoutMs: number;
}

export interface CommercialAccountSessionResult {
  kind: "session";
  sessionToken: string;
  expiresAt: string | null;
  accountId: string | null;
  tenantId: string | null;
  displayName: string | null;
}

export interface CommercialAccountMfaResult {
  kind: "mfa";
  mfaChallengeToken: string;
  expiresAt: string | null;
}

export type CommercialAccountLoginResult = CommercialAccountSessionResult | CommercialAccountMfaResult;

export class CommercialAccountError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;
  readonly headquartersCode: string | null;

  constructor(code: string, message: string, options: { httpStatus?: number | null; headquartersCode?: string | null } = {}) {
    super(message);
    this.name = "CommercialAccountError";
    this.code = code;
    this.httpStatus = options.httpStatus ?? null;
    this.headquartersCode = options.headquartersCode ?? null;
  }
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateIdentifier(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 254 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_INPUT_INVALID", "A valid BossAI account phone number or email is required.");
  }
  return normalized;
}

function validatePassword(value: string): string {
  if (!value || value.length > 1024 || /[\u0000]/u.test(value)) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_INPUT_INVALID", "A BossAI account password is required.");
  }
  return value;
}

function validateMfaProof(value: string, recovery: boolean): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 256 || /[\u0000-\u001f\u007f\s]/u.test(normalized)) {
    throw new CommercialAccountError(
      "COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID",
      recovery ? "A valid BossAI MFA recovery code is required." : "A valid BossAI authenticator code is required.",
    );
  }
  if (!recovery && !/^\d{6}$/u.test(normalized)) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID", "The BossAI authenticator code must contain six digits.");
  }
  return normalized;
}

function safeHeadquartersCode(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9_]{1,100}$/u.test(normalized) ? normalized : null;
}

function safeErrorMessage(code: string | null, status: number): string {
  if (code === "BOSSAI_ACCOUNT_UNAUTHORIZED") return "The BossAI account identifier or password is incorrect.";
  if (code === "BOSSAI_ACCOUNT_FORBIDDEN") return "This BossAI commercial account is not active.";
  if (code === "BOSSAI_MFA_CODE_INVALID") return "The BossAI authenticator code is incorrect.";
  if (code === "BOSSAI_MFA_RECOVERY_CODE_INVALID") return "The BossAI MFA recovery code is invalid or has already been used.";
  if (code === "BOSSAI_MFA_CHALLENGE_INVALID") return "The BossAI MFA challenge expired or is no longer valid. Sign in again.";
  if (status === 429) return "Too many BossAI account attempts. Try again later.";
  return `BossAI Headquarters account request failed (HTTP ${status}).`;
}

async function parseErrorResponse(response: Response): Promise<CommercialAccountError> {
  let headquartersCode: string | null = null;
  try {
    const payload = await response.json() as unknown;
    if (isRecord(payload) && isRecord(payload.error)) headquartersCode = safeHeadquartersCode(payload.error.code);
  } catch {
    // Preserve only the safe HTTP status when the response is not JSON.
  }
  return new CommercialAccountError(
    "COMMERCIAL_ACCOUNT_HTTP_ERROR",
    safeErrorMessage(headquartersCode, response.status),
    { httpStatus: response.status, headquartersCode },
  );
}

async function postJson(
  config: CommercialAccountClientConfig,
  route: string,
  body: Record<string, unknown>,
  fetchImpl: FetchLike,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetchImpl(`${config.headquartersBaseUrl}${route}`, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new CommercialAccountError("COMMERCIAL_ACCOUNT_TIMEOUT", "BossAI Headquarters account request timed out.");
      }
      throw new CommercialAccountError("COMMERCIAL_ACCOUNT_UNAVAILABLE", "BossAI Headquarters account service is unavailable.");
    }

    if (!response.ok) throw await parseErrorResponse(response);
    try {
      return await response.json();
    } catch {
      throw new CommercialAccountError("COMMERCIAL_ACCOUNT_RESPONSE_INVALID", "BossAI Headquarters account response was not valid JSON.");
    }
  } finally {
    clearTimeout(timer);
  }
}

function parseSessionOrMfa(payload: unknown): CommercialAccountLoginResult {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_RESPONSE_INVALID", "BossAI Headquarters account response is invalid.");
  }
  const data = payload.data;

  if (data.mfaRequired === true) {
    const token = typeof data.mfaChallengeToken === "string" ? data.mfaChallengeToken : "";
    if (!/^bossai_mfa_[A-Za-z0-9_-]{20,}$/u.test(token)) {
      throw new CommercialAccountError("COMMERCIAL_ACCOUNT_RESPONSE_INVALID", "BossAI Headquarters MFA challenge is invalid.");
    }
    return {
      kind: "mfa",
      mfaChallengeToken: token,
      expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : null,
    };
  }

  const sessionToken = typeof data.sessionToken === "string" ? data.sessionToken : "";
  if (!/^bossai_session_[A-Za-z0-9_-]{20,}$/u.test(sessionToken)) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_RESPONSE_INVALID", "BossAI Headquarters account session is invalid.");
  }
  const account = isRecord(data.account) ? data.account : null;
  return {
    kind: "session",
    sessionToken,
    expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : null,
    accountId: account && typeof account.id === "string" ? account.id : null,
    tenantId: account && typeof account.tenantId === "string" ? account.tenantId : null,
    displayName: account && typeof account.displayName === "string" ? account.displayName : null,
  };
}

export async function loginHeadquartersAccount(
  config: CommercialAccountClientConfig,
  credentials: { identifier: string; password: string },
  fetchImpl: FetchLike = fetch,
): Promise<CommercialAccountLoginResult> {
  const payload = await postJson(config, "/api/v1/auth/login", {
    identifier: validateIdentifier(credentials.identifier),
    password: validatePassword(credentials.password),
    deviceId: config.installationId,
    productId: FUNDING_COMMERCIAL_PRODUCT_ID,
    productVersion: config.productVersion,
  }, fetchImpl);
  return parseSessionOrMfa(payload);
}

export async function confirmHeadquartersMfa(
  config: CommercialAccountClientConfig,
  challengeToken: string,
  proof: { code?: string; recoveryCode?: string },
  fetchImpl: FetchLike = fetch,
): Promise<CommercialAccountSessionResult> {
  if (!/^bossai_mfa_[A-Za-z0-9_-]{20,}$/u.test(challengeToken)) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID", "BossAI MFA challenge is invalid. Sign in again.");
  }
  const hasCode = typeof proof.code === "string" && proof.code.trim() !== "";
  const hasRecovery = typeof proof.recoveryCode === "string" && proof.recoveryCode.trim() !== "";
  if (hasCode === hasRecovery) {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_MFA_INPUT_INVALID", "Provide either an authenticator code or a recovery code.");
  }

  const body = hasCode
    ? { mfaChallengeToken: challengeToken, code: validateMfaProof(proof.code ?? "", false) }
    : { mfaChallengeToken: challengeToken, recoveryCode: validateMfaProof(proof.recoveryCode ?? "", true) };
  const payload = await postJson(config, "/api/v1/auth/mfa/login/confirm", body, fetchImpl);
  const result = parseSessionOrMfa(payload);
  if (result.kind !== "session") {
    throw new CommercialAccountError("COMMERCIAL_ACCOUNT_RESPONSE_INVALID", "BossAI Headquarters MFA confirmation did not create an account session.");
  }
  return result;
}
