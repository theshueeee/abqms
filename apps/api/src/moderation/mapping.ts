import { SuspensionOutcome } from "@prisma/client";

// OQ-10: the authoritative mapping between
// `SuspensionRecord.outcome` and `Patient.account_status`. Both enums describe
// the same compliance state machine; this is the single-written projection.
// A `pending` flag keeps the account `flagged` until reviewed, a review that
// suspends the account writes `suspended`, and reinstatement returns it to
// `active`.

type AccountStatus = "active" | "flagged" | "suspended";

export const OUTCOME_TO_STATUS: Record<SuspensionOutcome, AccountStatus> = {
  [SuspensionOutcome.pending]: "flagged",
  [SuspensionOutcome.suspended]: "suspended",
  [SuspensionOutcome.reinstated]: "active",
};

export const STATUS_TO_OUTCOME: Record<AccountStatus, SuspensionOutcome> = {
  active: SuspensionOutcome.reinstated,
  flagged: SuspensionOutcome.pending,
  suspended: SuspensionOutcome.suspended,
};

// Maps a review outcome to the account status it should produce on `Patient`.
export function mapStatusFromOutcome(outcome: SuspensionOutcome): AccountStatus {
  return OUTCOME_TO_STATUS[outcome];
}

// The account status that holds while a given review outcome is the latest.
export function mapOutcomeFromStatus(status: AccountStatus): SuspensionOutcome {
  return STATUS_TO_OUTCOME[status];
}