[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/muhammad-rafly/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/muhammad-rafly/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

# Token Radar

The best token launch radar: a program that reads a sealed snapshot of every
protocol DefiLlama tracks, works out which ones still record no token, ranks
them by what their launch would be worth, and hands in a web dashboard with
the board, a detail view for each protocol and the steps to farm it.

## The model — radar-2

```
implied value = TVL × 0.30 × growth × maturity × precedent × reach
```

- **Base:** TVL × 0.30.
- **Growth:** 1 + (7-day TVL change, clamped to −50%…+100%) × 0.6.
- **Maturity:** 0.70 + min(age in days, 730) / 730 × 0.30. Unknown listing date counts as 365 days.
- **Precedent:** 0.85 + launch-rate(category) × 0.30, where the launch rate is the
  share of the snapshot's protocols in that category that already record a token —
  read off the snapshot itself, never written by hand.
- **Reach:** 1 + 0.02 × chains (up to 5).

No protocol name is ever special-cased. The board says a protocol **records no
token**, never that it has none: the snapshot is DefiLlama's record, not proof.

## The board

226 rows: all 40 protocols on the snapshot's watchlist (≥ $50M TVL, no token
recorded, not a wrapped/staked/bridged product of one that trades) plus 186
early finds below the floor. Each row carries six farm steps with what they
cost and how long they take. Protocols whose token already trades are shown
separately, at the market's own values.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

Node 22 or later, standard library only. The program writes `board.json`,
`data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output
directory, and runs twice to identical bytes.

## License

MIT — see [LICENSE](LICENSE).
