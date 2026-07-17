import type { AssetSummary, SeriesSummary } from "../lib/types.ts";
import { AssetCard } from "./AssetCard.tsx";

interface AssetGridProps {
  assets: AssetSummary[];
  series: SeriesSummary[];
}

export function AssetGrid({ assets, series }: AssetGridProps) {
  return (
    <section aria-labelledby="assets-heading">
      <h2 id="assets-heading" className="section-title">
        Crypto assets
      </h2>
      <div className="asset-grid">
        {assets.map((asset) => (
          <AssetCard key={asset.symbol} asset={asset} series={series} />
        ))}
      </div>
    </section>
  );
}
