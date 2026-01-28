"use client";

// VerifiedPickList.tsx
// This component will display a list of all verified stock picks.
import { VerifiedPick } from "./VerifiedPickDetailModal";

interface Props {
  picks: VerifiedPick[];
  onPickClick: (pick: VerifiedPick) => void;
}

export default function VerifiedPickList({ picks, onPickClick }: Props) {
  return (
    <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
      <h3 className="text-lg font-bold text-white mb-6">
        All Verified Picks ({picks.length})
      </h3>
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
                Date Verified
              </th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick, i) => (
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
                <td className="px-6 py-4 text-neutral-400">{pick.algorithm}</td>
                <td className="px-6 py-4 text-neutral-500 font-mono hidden md:table-cell">
                  {new Date(pick.verifiedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
