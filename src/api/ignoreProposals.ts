import { userCall } from "./transport";
import type { IgnoreProposalDecided, IgnoreProposals } from "./contract/armor-rest";

/** The areas to ignore that the observation service proposes and that wait for a decision (empty while the option to study the pictures is off). */
export const getIgnoreProposals = (origin: string) => userCall<IgnoreProposals>(origin, "GET", "/api/v1/ignore-proposals");

/** An administrator accepts (the rectangles join the areas the camera ignores) or rejects (dropped, not proposed again) the proposal of a camera. */
export const decideIgnoreProposal = (origin: string, cameraId: string, decision: "accept" | "reject") =>
  userCall<IgnoreProposalDecided>(origin, "POST", `/api/v1/ignore-proposals/${encodeURIComponent(cameraId)}`, { decision });
