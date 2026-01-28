#!/usr/bin/env tsx
/**
 * Score a single symbol with one algorithm. Used by the findstocks API for live re-scoring.
 * Usage: npx tsx scripts/score-one.ts SYMBOL ALGORITHM [TIMEFRAME]
 * ALGORITHM: "CAN SLIM" | "Technical Momentum" | "Composite Rating"
 * TIMEFRAME (required for Technical Momentum): "24h" | "3d" | "7d"
 * Output: JSON object to stdout, or { error: string }
 */

import { fetchMultipleStocks } from "./lib/stock-data-fetcher-enhanced";
import {
  scoreCANSLIM,
  scoreTechnicalMomentum,
  scoreComposite,
} from "./lib/stock-scorers";

async function main() {
  const [symbol = "", algorithm = "", timeframe = "7d"] = process.argv
    .slice(2)
    .map((s) => String(s).trim());
  if (!symbol || !algorithm) {
    console.log(
      JSON.stringify({
        error: "Usage: score-one SYMBOL ALGORITHM [TIMEFRAME]",
      }),
    );
    process.exit(1);
  }
  const sym = symbol.toUpperCase();
  const algo = algorithm.toLowerCase();
  const tf = (timeframe || "7d").toLowerCase() as "24h" | "3d" | "7d";

  try {
    const dataList = await fetchMultipleStocks([sym]);
    const data =
      dataList.find((d) => d.symbol.toUpperCase() === sym) ?? dataList[0];
    if (!data) {
      console.log(JSON.stringify({ error: `No data for symbol ${sym}` }));
      process.exit(1);
    }

    let result: Record<string, unknown> | null = null;
    if (algo.includes("can slim") || algo === "canslim") {
      result = scoreCANSLIM(data);
    } else if (algo.includes("technical") && algo.includes("momentum")) {
      result = scoreTechnicalMomentum(data, tf);
    } else if (algo.includes("composite")) {
      result = scoreComposite(data);
    } else {
      console.log(
        JSON.stringify({
          error: `Unknown algorithm: ${algorithm}. Use "CAN SLIM", "Technical Momentum", or "Composite Rating"`,
        }),
      );
      process.exit(1);
    }

    if (!result) {
      console.log(
        JSON.stringify({
          error: `Algorithm returned no score for ${sym} (e.g. insufficient history)`,
        }),
      );
      process.exit(1);
    }
    console.log(JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify({ error: message }));
    process.exit(1);
  }
}

main();
