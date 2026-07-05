import type { DiligenceFlags, GateCheck, GateDecision, Rating } from "./types";

function check(passed: boolean, key: string, passReason: string, failReason: string): GateCheck {
  return {
    key,
    passed,
    reason: passed ? passReason : failReason,
  };
}

export function evaluateDiligence(flags: DiligenceFlags): GateDecision {
  const checks: GateCheck[] = [
    check(!flags.sanctionsHit, "sanctions", "No sanctions hit", "Sanctions hit detected"),
    check(
      !flags.duplicateTokenization,
      "duplicateTokenization",
      "No duplicate tokenization detected",
      "Asset fingerprint already tokenized"
    ),
    check(
      !flags.kycExpiredOrMissing,
      "kyc",
      "KYC validity present",
      "KYC expired or missing"
    ),
    check(
      !flags.liquidityExitMissing,
      "liquidityExit",
      "Liquidity exit path documented",
      "Liquidity exit path missing"
    ),
    check(!flags.rightsUnclear, "rights", "Tokenization rights are clear", "Rights are unclear"),
    check(
      !flags.docsIncomplete,
      "documents",
      "Required documents are complete",
      "Required documents are incomplete"
    ),
    check(
      !flags.onchainAnomaly,
      "onchain",
      "No critical on-chain anomaly",
      "On-chain anomaly detected"
    ),
  ];

  let rating: Rating = "GREEN";
  if (flags.sanctionsHit || flags.duplicateTokenization || flags.kycExpiredOrMissing) {
    rating = "RED";
  } else if (flags.liquidityExitMissing || flags.rightsUnclear || flags.docsIncomplete || flags.onchainAnomaly) {
    rating = "YELLOW";
  }

  return {
    rating,
    allowed: rating !== "RED",
    reasons: checks.filter((c) => !c.passed).map((c) => c.reason),
    checks,
  };
}
