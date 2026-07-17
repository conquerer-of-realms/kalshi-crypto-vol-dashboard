import { FreshnessBadge } from "./FreshnessBadge.tsx";
import { formatGeneratedAt } from "../lib/format.ts";

interface HeaderProps {
  generatedAt: string | null;
  status: string;
  isFixtureData: boolean;
}

export function Header({ generatedAt, status, isFixtureData }: HeaderProps) {
  const { utc, eastern } = formatGeneratedAt(generatedAt);

  return (
    <header className="header">
      <div className="header__top">
        <div>
          <h1 className="header__title">Kalshi &times; Crypto Volatility</h1>
          <p className="header__subtitle">
            Prediction-market repricing viewed through crypto volatility
          </p>
        </div>
        <div className="header__meta">
          <FreshnessBadge generatedAt={generatedAt} buildStatus={status} />
          <div className="header__timestamps tabular-nums">
            <span>Last update: {utc}</span>
            <span>{eastern}</span>
          </div>
        </div>
      </div>
      {isFixtureData && (
        <div className="demo-banner" role="status">
          This is fixture/demo data for local preview only. It has not been fetched from live
          APIs. Run <code>npm run data:update</code> to load real Kalshi and crypto data.
        </div>
      )}
    </header>
  );
}
