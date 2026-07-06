# Pipelines

### Manage Pipelines

```bash
# Create pipeline
wrangler pipelines create my-pipeline --r2 my-bucket

# List pipelines
wrangler pipelines list

# Show pipeline details
wrangler pipelines show my-pipeline

# Update pipeline
wrangler pipelines update my-pipeline --batch-max-mb 100

# Delete pipeline
wrangler pipelines delete my-pipeline
```

### Config Binding

```jsonc
{
  "pipelines": [
    { "binding": "MY_PIPELINE", "pipeline": "my-pipeline" }
  ]
}
```

---
