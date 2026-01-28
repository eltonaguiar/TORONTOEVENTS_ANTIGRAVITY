#!/usr/bin/env tsx
/**
 * Generate daily portfolio from daily stock picks.
 * Reads data/daily-stocks.json (or public/data/daily-stocks.json), runs equal-weight
 * optimizer, writes data/daily-portfolio.json and public/data/daily-portfolio.json.
 * See .agent/FEATURE_PLAN_2026-01-28.md
 */

import * as fs from "fs";
import * as path from "path";
import { equalWeightPortfolio, PickInput } from "./lib/portfolio-optimizer";

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_DATA = path.join(process.cwd(), "public", "data");

function loadPicks(): PickInput[] {
  const paths = [
    path.join(DATA_DIR, "daily-stocks.json"),
    path.join(PUBLIC_DATA, "daily-stocks.json"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
      const stocks = raw.stocks ?? raw.picks ?? [];
      return stocks.map((s: Record<string, unknown>) => ({
        symbol: s.symbol,
        name: s.name ?? s.symbol,
        price: s.price as number | undefined,
        entryPrice: s.entryPrice as number | undefined,
        simulatedEntryPrice: s.simulatedEntryPrice as number | undefined,
        score: (s.score as number) ?? 0,
        rating: (s.rating as string) ?? "HOLD",
        risk: s.risk as string | undefined,
        algorithm: s.algorithm as string | undefined,
      }));
    }
  }
  throw new Error("No daily-stocks.json found in data/ or public/data/");
}

function main() {
  console.log("📊 Loading daily picks...");
  const picks = loadPicks();
  console.log(`   Loaded ${picks.length} picks.`);

  const result = equalWeightPortfolio(picks, {
    maxPositions: 10,
    maxWeightPerPosition: 0.2,
  });

  console.log(`   Strategy: ${result.strategy}`);
  console.log(`   Positions: ${result.totalPositions}`);
  console.log(`   Total weight: ${(result.totalWeight * 100).toFixed(2)}%`);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PUBLIC_DATA)) fs.mkdirSync(PUBLIC_DATA, { recursive: true });

  const outPath = path.join(DATA_DIR, "daily-portfolio.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`✅ Wrote ${outPath}`);

  const publicPath = path.join(PUBLIC_DATA, "daily-portfolio.json");
  fs.writeFileSync(publicPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`✅ Wrote ${publicPath}`);
}

main();
