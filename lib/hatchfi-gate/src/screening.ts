import { OFAC_DENYLIST_SET, OFAC_DENYLIST_SIZE } from "./denylist";

// Real sanctions screening — a set-membership check against the shipped OFAC
// snapshot (and, optionally, the live on-chain oracle). This is what turns
// diligence_screen from "format the caller's flag" into "perform the check".
export type ScreeningResult = {
  subject: string;
  sanctioned: boolean;
  source: "ofac-snapshot" | "ofac-snapshot+onchain-oracle";
  matched: boolean; // the snapshot/oracle actually flagged this address
  listSize: number;
  checkedAt: number;
};

/** Synchronous, offline screening against the shipped OFAC snapshot. */
export function screenAddress(subject: string): ScreeningResult {
  const norm = subject.toLowerCase();
  const matched = OFAC_DENYLIST_SET.has(norm);
  return {
    subject,
    sanctioned: matched,
    source: "ofac-snapshot",
    matched,
    listSize: OFAC_DENYLIST_SIZE,
    checkedAt: Math.floor(Date.now() / 1000),
  };
}

type OracleReader = (subject: `0x${string}`) => Promise<boolean>;

/**
 * Screening that also consults a live on-chain OFAC oracle (read-only). Falls
 * back to the snapshot result if the oracle read throws (RPC rate limit, etc.).
 */
export async function screenAddressLive(
  subject: string,
  readOracle: OracleReader
): Promise<ScreeningResult> {
  const base = screenAddress(subject);
  try {
    const onchain = await readOracle(subject as `0x${string}`);
    return {
      ...base,
      sanctioned: base.matched || onchain,
      matched: base.matched || onchain,
      source: "ofac-snapshot+onchain-oracle",
    };
  } catch {
    return base;
  }
}
