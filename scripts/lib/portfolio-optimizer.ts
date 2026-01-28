/**
 * Portfolio Optimizer – Phase 1
 * Converts daily stock picks into an allocated portfolio (equal weight, constraints).
 * See .agent/FEATURE_PLAN_2026-01-28.md
 */

export interface PickInput {
  symbol: string;
  name: string;
  price?: number;
  entryPrice?: number;
  simulatedEntryPrice?: number;
  score: number;
  rating: string;
  risk?: string;
  algorithm?: string;
}

export interface PortfolioAllocation {
  symbol: string;
  name: string;
  weight: number;
  /** Notional per $10k portfolio */
  notional10k: number;
  entryPrice: number;
  score: number;
  rating: string;
  algorithm?: string;
}

export interface PortfolioResult {
  generatedAt: string;
  strategy: "equal_weight";
  totalPositions: number;
  totalWeight: number;
  constraints: { maxPositions: number; maxWeightPerPosition: number };
  allocations: PortfolioAllocation[];
}

const DEFAULT_MAX_POSITIONS = 10;
const DEFAULT_MAX_WEIGHT_PER_NAME = 0.2; // 20%

/**
 * Equal-weight portfolio from top picks, with max positions and max weight per name.
 */
export function equalWeightPortfolio(
  picks: PickInput[],
  options: { maxPositions?: number; maxWeightPerPosition?: number } = {}
): PortfolioResult {
  const maxPositions = options.maxPositions ?? DEFAULT_MAX_POSITIONS;
  const maxWeight = options.maxWeightPerPosition ?? DEFAULT_MAX_WEIGHT_PER_NAME;

  const sorted = [...picks]
    .filter((p) => (p.price ?? p.entryPrice ?? p.simulatedEntryPrice) != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPositions);

  const n = sorted.length;
  if (n === 0) {
    return {
      generatedAt: new Date().toISOString(),
      strategy: "equal_weight",
      totalPositions: 0,
      totalWeight: 0,
      constraints: { maxPositions, maxWeightPerPosition: maxWeight },
      allocations: [],
    };
  }

  let rawWeight = 1 / n;
  if (rawWeight > maxWeight) {
    rawWeight = maxWeight;
  }
  const totalWeight = rawWeight * n;
  const allocations: PortfolioAllocation[] = sorted.map((p) => {
    const entryPrice =
      p.simulatedEntryPrice ?? p.entryPrice ?? p.price ?? 0;
    const notional10k = 10_000 * rawWeight;
    return {
      symbol: p.symbol,
      name: p.name,
      weight: rawWeight,
      notional10k: Math.round(notional10k * 100) / 100,
      entryPrice,
      score: p.score,
      rating: p.rating,
      algorithm: p.algorithm,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    strategy: "equal_weight",
    totalPositions: n,
    totalWeight: Math.round(totalWeight * 10000) / 10000,
    constraints: { maxPositions, maxWeightPerPosition: maxWeight },
    allocations,
  };
}
