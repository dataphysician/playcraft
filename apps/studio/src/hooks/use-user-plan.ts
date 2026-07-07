import React from "react";

export type UserPlan = "free" | "paid";

const DEFAULT_PLAN: UserPlan = "paid";

/**
 * Returns the user's current plan. In production this would consult the
 * authenticated session; in the studio dev environment we hardcode `paid`
 * so the "Request Paid Online Assembly" affordance is reachable for testing.
 * Returning `free` from this hook would hide the paid-action button entirely.
 */
export function useUserPlan(): UserPlan {
  const [plan] = React.useState<UserPlan>(DEFAULT_PLAN);
  return plan;
}