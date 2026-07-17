import type { AssetSummary } from "../lib/types.ts";
import { AssetCard } from "./AssetCard.tsx";

interface AssetGridProps {
  assets: AssetSummary[];
}

export function AssetGrid({ assets }: AssetGridProps) {
  return (
    <section aria-labelledby="assets-heading">
      <h2 id="assets-heading" className="section-title">
        Crypto assets
      </h2>
      <div className="asset-grid">
        {assets.map((asset) => (
          <AssetCard key={asset.symbol} asset={asset} />
        ))}
      </div>
    </section>
  );
}
