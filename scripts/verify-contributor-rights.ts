import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface ContributorRightsPolicy {
  schemaVersion: "bossai.contributor-rights-policy.v1";
  claVersion: string;
  requiredAttestation: string;
  trustedGitHubLogins: string[];
  trustedBots: string[];
}

export interface ContributorRightsEvaluation {
  ok: boolean;
  reason: string;
}

export function evaluateContributorRights({
  actor,
  body,
  policy,
}: {
  actor: unknown;
  body: unknown;
  policy: ContributorRightsPolicy;
}): ContributorRightsEvaluation {
  const login = String(actor ?? "").trim();
  if (!login) return { ok: false, reason: "Pull request author is missing." };

  if (policy.trustedGitHubLogins.includes(login)) {
    return { ok: true, reason: `Trusted BossAI contributor: ${login}.` };
  }
  if (policy.trustedBots.includes(login)) {
    return { ok: true, reason: `Trusted dependency automation: ${login}.` };
  }

  const attestation = `- [x] ${policy.requiredAttestation}`;
  const normalizedBody = String(body ?? "").replace(/\r\n/g, "\n");
  if (!normalizedBody.includes(attestation)) {
    return {
      ok: false,
      reason: `External contributor must check the exact CLA v${policy.claVersion} attestation in the pull request body.`,
    };
  }

  return { ok: true, reason: `CLA v${policy.claVersion} attestation accepted from ${login}.` };
}

function loadPolicy(root: string): ContributorRightsPolicy {
  const path = resolve(root, ".github", "contributor-rights-policy.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ContributorRightsPolicy>;
  if (parsed.schemaVersion !== "bossai.contributor-rights-policy.v1") throw new Error("Unsupported contributor-rights policy schema.");
  if (!Array.isArray(parsed.trustedGitHubLogins) || !Array.isArray(parsed.trustedBots)) throw new Error("Contributor-rights policy allowlists are invalid.");
  if (!parsed.claVersion || !parsed.requiredAttestation) throw new Error("Contributor-rights policy is incomplete.");
  return parsed as ContributorRightsPolicy;
}

async function setCommitStatus({
  repository,
  sha,
  token,
  state,
  description,
}: {
  repository: string;
  sha: string;
  token: string;
  state: "success" | "failure";
  description: string;
}): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${repository}/statuses/${sha}`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "bossai-funding-contributor-rights",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({
      state,
      context: "contributor-rights",
      description: description.slice(0, 140),
    }),
  });
  if (!response.ok) throw new Error(`Failed to publish contributor-rights status: HTTP ${response.status}.`);
}

async function main(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!eventPath || !repository || !token) throw new Error("GitHub contributor-rights environment is incomplete.");

  const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
    pull_request?: {
      number?: number;
      body?: string | null;
      user?: { login?: string | null };
      head?: { sha?: string };
    };
  };
  const pull = event.pull_request;
  if (!pull?.head?.sha) throw new Error("This verifier requires a pull_request_target event.");

  const policy = loadPolicy(process.cwd());
  const result = evaluateContributorRights({ actor: pull.user?.login, body: pull.body, policy });

  await setCommitStatus({
    repository,
    sha: pull.head.sha,
    token,
    state: result.ok ? "success" : "failure",
    description: result.reason,
  });

  console.log(JSON.stringify({
    schemaVersion: "bossai.contributor-rights-result.v1",
    pullRequest: pull.number ?? null,
    headSha: pull.head.sha,
    actor: pull.user?.login ?? null,
    claVersion: policy.claVersion,
    ok: result.ok,
    reason: result.reason,
  }));

  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
