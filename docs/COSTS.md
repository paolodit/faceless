# Costs

`video-pack plan` writes a cost estimate to:

```text
output/cost_estimate.json
```

It also prints a readable estimate in the terminal.

## Base Estimate

The base estimate is simple arithmetic:

```text
image count x configured per-image cost
```

Example:

```yaml
costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
```

## Cautious Estimate

The cautious estimate applies a multiplier:

```yaml
costs:
  cost_multiplier: 2
```

So a base estimate of `GBP 0.88` becomes a cautious estimate of `GBP 1.76`.

The default multiplier is `2`.

## Why Actual Costs May Differ

Actual costs can vary by:

- provider
- model
- quality
- image size
- retries
- failed or repeated generations
- provider billing behaviour

Treat estimates as planning guidance, not billing guarantees.

## Editing the Estimate

Change the values in `project.yml`:

```yaml
costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
  cost_multiplier: 2
```

Then rerun:

```bash
video-pack plan --project ./my-project --force
```
