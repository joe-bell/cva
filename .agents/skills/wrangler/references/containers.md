# Containers

### Build and Push Images

```bash
# Build container image
wrangler containers build -t my-app:latest .

# Build and push in one command
wrangler containers build -t my-app:latest . --push

# Push existing image to Cloudflare registry
wrangler containers push my-app:latest
```

### Manage Containers

```bash
# List containers
wrangler containers list

# Get container info
wrangler containers info <CONTAINER_ID>

# Delete container
wrangler containers delete <CONTAINER_ID>
```

### Manage Images

```bash
# List images in registry
wrangler containers images list

# Delete image
wrangler containers images delete my-app:latest
```

### Manage External Registries

> **Security**: Never hardcode registry credentials in commands. Use environment variables.

```bash
# List configured registries
wrangler containers registries list

# Configure external registry (e.g., ECR)
wrangler containers registries configure <DOMAIN> \
  --aws-access-key-id "$AWS_ACCESS_KEY_ID"

# Configure DockerHub
wrangler containers registries configure <DOMAIN> \
  --dockerhub-username "$DOCKERHUB_USERNAME"

# Delete registry configuration
wrangler containers registries delete <DOMAIN>
```

---
