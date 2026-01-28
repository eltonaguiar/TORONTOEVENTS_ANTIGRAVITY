"use client";

// VerifiedPickList.tsx
// This component will display a list of all verified stock picks.
import { VerifiedPick } from "./VerifiedPickDetailModal";

interface Props {
  picks: VerifiedPick[];
  onPickClick: (pick: VerifiedPick) => void;
  paged?: boolean;
}

export default function VerifiedPickList({ picks, onPickClick, paged }: Props) {
  const displayPicks = paged ? picks.slice(0, 10) : picks;

  return (
    <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">
          {paged ? "Recent Verified Picks" : `All Verified Picks (${picks.length})`}
        </h3>
        {paged && picks.length > 10 && (
          <button className="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
            View All History →
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-neutral-500 uppercase font-mono border-b border-white/10">
            <tr>
              <th scope="col" className="px-6 py-3">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 text-right">
                Realized Return
              </th>
              <th scope="col" className="px-6 py-3">
                Algorithm
              </th>
              <th scope="col" className="px-6 py-3 hidden md:table-cell">
                Verified On
              </th>
            </tr>
          </thead>
          <tbody>
            {displayPicks.map((pick, i) => (
              <tr
                key={i}
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => onPickClick(pick)}
              >
                <th
                  scope="row"
                  className="px-6 py-4 font-bold text-white whitespace-nowrap"
                >
                  {pick.symbol}
                </th>
                <td
                  className={`px-6 py-4 text-right font-bold ${pick.realizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {pick.realizedReturn >= 0 ? "+" : ""}
                  {pick.realizedReturn.toFixed(2)}%
                </td>
                <td className="px-6 py-4">
                  <span className="text-neutral-300 block">{pick.algorithm}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{pick.timeframe} Hold</span>
                </td>
                <td className="px-6 py-4 text-neutral-500 font-mono hidden md:table-cell">
                  {new Date(pick.verifiedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {displayPicks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                  No verified picks found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
