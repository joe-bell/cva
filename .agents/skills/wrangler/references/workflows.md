# Workflows

### Manage Workflows

```bash
# List workflows
wrangler workflows list

# Describe workflow
wrangler workflows describe my-workflow

# Trigger workflow instance
wrangler workflows trigger my-workflow

# Trigger with parameters
wrangler workflows trigger my-workflow --params '{"key": "value"}'

# Delete workflow
wrangler workflows delete my-workflow
```

### Manage Workflow Instances

```bash
# List instances
wrangler workflows instances list my-workflow

# Describe instance
wrangler workflows instances describe my-workflow <INSTANCE_ID>

# Terminate instance
wrangler workflows instances terminate my-workflow <INSTANCE_ID>
```

### Config Binding

```jsonc
{
  "workflows": [
    {
      "binding": "MY_WORKFLOW",
      "name": "my-workflow",
      "class_name": "MyWorkflow"
    }
  ]
}
```

---
