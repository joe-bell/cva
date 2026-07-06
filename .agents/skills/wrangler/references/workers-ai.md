# Workers AI

### List Models

```bash
# List available models
wrangler ai models

# List finetunes
wrangler ai finetune list
```

### Config Binding

```jsonc
{
  "ai": { "binding": "AI" }
}
```

**Note**: Workers AI always runs remotely and incurs usage charges even in local dev.

---
