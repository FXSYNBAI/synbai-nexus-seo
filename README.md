# SYNBAI Nexus — quantitative research release

Public-facing SEO, documentation and release metadata for [fxsynbai.eu](https://fxsynbai.eu/).

SYNBAI Nexus is a Windows-first quantitative research workspace for systematic strategy discovery. It helps researchers make assumptions visible through reproducible backtesting, execution-cost modeling, out-of-sample validation, walk-forward analysis and Monte Carlo robustness checks.

## Current release

**Version:** 0.2.0.1  
**Platform:** Windows 10/11, x64  
**Installer:** [Download from fxsynbai.eu](https://fxsynbai.eu/download/)  
**Store package:** [Microsoft Store listing](https://apps.microsoft.com/detail/9N1F6G55ZF23)

The installer is distributed through the official website so the download URL can be updated without breaking release documentation.

## Research workflow

1. Import or select historical market data.
2. Define a focused systematic strategy search.
3. Model spread, commission and slippage.
4. Separate in-sample and out-of-sample evidence.
5. Review walk-forward and Monte Carlo robustness.
6. Export MQL5 source only after reviewing the assumptions.

## Beginner-safe defaults

The 0.2.0.1 release starts with a conservative research profile:

- fixed lot: 0.02;
- 3-point execution slippage;
- 5-point Monte Carlo extra-slippage stress;
- The5ers High Stakes Step 1 screening preset;
- combined IS/OOS quality gates;
- minimum net-profit screen of 20% for the selected research period.

These are research filters, not guarantees of future performance or evaluation results.

## Integrity

Installer SHA-256:

```
259B3ADD39C448AE90542643177F477466A0BF5D49753E4EF8E35A1242754573
```

The application does not place live orders by default. Historical results are not financial advice, do not guarantee future performance, and should be checked against current broker specifications and any external program rules.

## Discoverability topics

quantitative research · systematic strategies · reproducible backtesting · out-of-sample validation · walk-forward analysis · Monte Carlo robustness · execution costs · portfolio research · XAUUSD · MT5 · MQL5

## Contributing and feedback

Use the website research pages for the methodology and release notes. Open a GitHub issue for reproducibility problems, documentation gaps or clear product bugs. Please include the app version, operating system, dataset period and the relevant assumptions.


## Public research resources

- [Research methodology](docs/RESEARCH-METHODOLOGY.md)
- [Public repository roadmap](docs/GITHUB-REPOSITORY-ROADMAP.md)
- [X build-in-public content calendar](docs/X-CONTENT-CALENDAR.md)
- [Release 0.2.0.1](releases/SYNBAI-Nexus-0.2.0.1.md)
- [Installer checksum](releases/SYNBAI-Nexus-Setup-0.2.0.1-win-x64.sha256)
