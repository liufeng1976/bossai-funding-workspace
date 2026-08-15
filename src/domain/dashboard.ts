import { chooseTodayFocus } from "./focus.ts";
import type {
  CompanyProfile,
  DashboardProjection,
  FundingAction,
  FundingGoal,
  FundraisingRound,
  FundingTrack,
  TrackSummary,
} from "./types.ts";

const inactiveStages = new Set(["received", "rejected", "passed", "not-a-fit", "closed"]);

function latestAction(actions: FundingAction[]): FundingAction | null {
  return [...actions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

function trackSummary(track: FundingTrack, actions: FundingAction[]): TrackSummary {
  const trackActions = actions.filter((action) => action.track === track);
  const active = trackActions.filter((action) => !inactiveStages.has(action.stage));
  const latest = latestAction(trackActions);
  const nearDeadline = active
    .filter((action) => action.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))[0];

  return {
    track,
    potentialAmountCents: active.reduce((sum, action) => sum + Math.max(0, action.amountCents), 0),
    activeCount: active.length,
    latestAction: latest ? `${latest.title} · ${latest.stage}` : "No financing action yet",
    risk: nearDeadline
      ? `${nearDeadline.title} has the nearest deadline (${nearDeadline.deadline}).`
      : active.length > 0
        ? "No immediate deadline is recorded; confirm that each active item has a dated next step."
        : "This track has no active item yet.",
    nextStep: latest?.nextStep || `Create the first ${track} financing action.`,
  };
}

export function projectDashboard(
  profile: CompanyProfile | null,
  goal: FundingGoal | null,
  rounds: FundraisingRound[],
  actions: FundingAction[],
  now = new Date(),
): DashboardProjection {
  const targetAmountCents = Math.max(
    0,
    goal?.targetAmountCents ?? profile?.targetFundingCents ?? rounds[0]?.targetAmountCents ?? 0,
  );

  const receivedAmountCents = rounds.reduce((sum, round) => sum + Math.max(0, round.receivedAmountCents), 0);
  const committedAmountCents = rounds.reduce(
    (sum, round) => sum + Math.max(0, round.committedAmountCents - round.receivedAmountCents),
    0,
  );
  const activePipelineCents = actions
    .filter((action) => !inactiveStages.has(action.stage) && action.stage !== "committed")
    .reduce((sum, action) => sum + Math.max(0, action.amountCents), 0);

  return {
    targetAmountCents,
    receivedAmountCents,
    committedAmountCents,
    activePipelineCents,
    remainingGapCents: Math.max(0, targetAmountCents - receivedAmountCents - committedAmountCents),
    tracks: (["grant", "debt", "equity"] as const).map((track) => trackSummary(track, actions)),
    todayFocus: chooseTodayFocus(profile, goal, actions, now),
  };
}
