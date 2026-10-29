# Benchmark cost estimate (plan §9, §13 item 9)

An estimate for budgeting, not a quote. The token profile is measured from our own OpenClaw runs. Prices are Anthropic first-party API rates as listed in the Claude API reference (cached 2026-10-06); check the live pricing page before committing a budget.

## Run count

From plan §9, v0.1: 40 scenarios × 2 models × 3 repeats × 11 configuration-user combinations (2 stock configurations, plus 3 asking configurations × 3 simulated users) = **2,640 runs**, or 1,320 per model. v0.2: 10,000–17,000 runs. The simulated users are scripted, so they make no model calls.

## Tokens per run

| Part | Tokens | Basis |
|---|---|---|
| Cacheable prefix per model call | ~10,200 | OpenClaw's system prompt (30,270 chars) plus the compact-surface tool schemas (10,421 chars) at ~4 chars/token, measured in run `ch-guard6` (`llm_input`). The full surface would be ~120k chars of tool schemas, so keep the compact surface on |
| Model calls per run | 6 | A typical scenario: fetch or read, one or two follow-ups, one action, final reply |
| Conversation growth per call | ~1,800 | One tool result (pages are capped) plus one assistant turn |
| Output per call | ~600 | Visible output plus adaptive thinking at medium effort |

Per run, that's a 10.2k cache write, 51k cache reads (the prefix on calls 2–6), 27k uncached history input (conservative: history itself isn't counted as cached), and 3.6k output.

## Cost

Prices per million tokens: input / output / cache read. A 5-minute cache write is 1.25× input.

| Model | Price | Per run | 1,320 runs (one model, v0.1) |
|---|---|---|---|
| Claude Opus 5.5 | $4 / $20 / $0.20 | $0.24 | **$318** |
| Claude Sonnet 5.5 | $2 / $10 / $0.20 | $0.13 | **$166** |
| Claude Haiku 5.5 | $0.10 / $0.50 / $0.01 | $0.006 | **$8** |

**v0.1 totals (two models):**
- frontier + small (Opus 5.5 + Haiku 5.5): **≈ $330**;
- Opus 5.5 + Sonnet 5.5: **≈ $480**.

For a safety margin, double these:
- the tokenizer can count up to ~1.35× more tokens than chars/4;
- attack scenarios with long pages or retries run longer.

That gives a planning budget of **$650–$1,000**.

**v0.2** (10,000–17,000 runs, Opus 5.5 + Sonnet 5.5): $1,800–$3,100 at the base profile, **$3,600–$6,200** with the margin.

Levers:
- **Keep the cache warm:** keep the prefix byte-identical across a scenario's calls. Re-running scenarios back to back, under 5 minutes apart, keeps the cache warm across runs too.
- **Cheaper second model:** Haiku 5.5 as the small model.
- **Batches don't apply:** the Batches API's 50% discount doesn't fit interactive agent loops.

## Wall-clock

- **Mock runs:** 7–20 s per agent run on the cluster.
- **Real-model runs:** assume ~60–90 s each, from 6 model calls at roughly 5–15 s plus Gateway overhead.
- **Parallelism:** the contract sweeps ran 6 agent runs at a time against one Gateway on a 10-CPU node.

That puts v0.1 at **about 8–11 hours** on one such node (2,640 runs × ~70 s ÷ 6). Two Gateways, or a bigger allocation, halve it. API rate limits, not CPU, are the likely ceiling at higher parallelism.
