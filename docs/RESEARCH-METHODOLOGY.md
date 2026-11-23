# SYNBAI Nexus research methodology

SYNBAI Nexus is a quantitative research workspace for systematic strategy discovery. A result is treated as a research artifact, not a forecast.

## Research sequence

1. **Data intake** — document instrument, timeframe, source, timezone, date range and missing-data handling.
2. **Execution assumptions** — record spread model, commission, slippage, point size, swap and position-sizing assumptions.
3. **Candidate search** — use a bounded strategy space and a fixed random seed where applicable.
4. **In-sample screening** — evaluate candidates on the development segment and apply the documented quality gates.
5. **Out-of-sample admission** — rank candidates on a chronological holdout that was not used to fit the search.
6. **Walk-forward review** — evaluate repeated chronological folds and report aggregate results separately.
7. **Monte Carlo stress** — resample completed trades and apply additional slippage stress; report negative-return paths and drawdown percentiles.
8. **Export review** — inspect the generated MQL5 source and compile/test it independently before any external use.

## Minimum report fields

Every published report should include:

- dataset name, hash and date range;
- instrument, timeframe and timezone;
- spread, commission, slippage and swap assumptions;
- IS/OOS split and walk-forward folds;
- number of candidates tested and rejected;
- Profit Factor, net return, maximum drawdown, trailing drawdown, expectancy and trade count;
- Monte Carlo iterations, seed and percentile results;
- known limitations and next validation step.

## Interpretation

A strong in-sample result is not sufficient. Out-of-sample, walk-forward and stress results must be read together. Historical research cannot guarantee future performance, broker execution quality or an external program result.
