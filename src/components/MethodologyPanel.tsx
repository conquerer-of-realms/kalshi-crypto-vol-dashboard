import type { MethodologyContent } from "../lib/types.ts";

interface MethodologyPanelProps {
  methodology: MethodologyContent;
  volumeWeightMethod: string;
  targetCalendarDays: number;
  minValidObservations: number;
}

export function MethodologyPanel({
  methodology,
  volumeWeightMethod,
  targetCalendarDays,
  minValidObservations,
}: MethodologyPanelProps) {
  return (
    <section className="panel methodology" aria-labelledby="methodology-heading">
      <h2 id="methodology-heading" className="section-title">
        Methodology &amp; limitations
      </h2>

      <details open>
        <summary>Series and assets</summary>
        <div className="methodology__body">
          <p>{methodology.seriesAndAssets}</p>
        </div>
      </details>

      <details>
        <summary>Signal formula</summary>
        <div className="methodology__body">
          <p>{methodology.signalFormula}</p>
        </div>
      </details>

      <details>
        <summary>Realized-volatility formula</summary>
        <div className="methodology__body">
          <p>{methodology.volatilityFormula}</p>
        </div>
      </details>

      <details>
        <summary>Data alignment</summary>
        <div className="methodology__body">
          <p>{methodology.dataAlignment}</p>
          <p>
            Data window target: {targetCalendarDays} calendar days, requiring at least{" "}
            {minValidObservations} valid daily observations before percentiles are considered reliable.
          </p>
        </div>
      </details>

      <details>
        <summary>Paper-based channel mapping</summary>
        <div className="methodology__body">
          <p>{methodology.channelMapping}</p>
        </div>
      </details>

      <details>
        <summary>Why this dashboard does not promise exact forecasts</summary>
        <div className="methodology__body">
          <p>{methodology.forecastDisclaimer}</p>
        </div>
      </details>

      <details>
        <summary>Dollar-volume approximation</summary>
        <div className="methodology__body">
          <p>{methodology.volumeApproximation}</p>
          <p className="methodology__code">Selected method: {volumeWeightMethod}</p>
        </div>
      </details>

      <details>
        <summary>Limitations</summary>
        <div className="methodology__body">
          <ul>
            {methodology.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
