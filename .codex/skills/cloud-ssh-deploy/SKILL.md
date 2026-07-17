---
name: cloud-ssh-deploy
description: Project-local workflow for deploying this Go + Astro repository to a cloud Linux server over SSH. Use when the user asks to deploy, publish, release to cloud, update the Baota/BT Go project, run npm run deploy:cloud, or make deployment reusable across machines. Guides Codex to collect missing host/user/auth details safely, run the repo deployment script, and verify the live service without storing secrets.
---

# Cloud SSH Deploy

Use this skill only from this repository root. It orchestrates the project-owned deployment script; it does not store server credentials.

## Safety Rules

- Never write server passwords, private keys, panel tokens, or concrete production credentials into repo files, commits, logs, or docs.
- If `DEPLOY_HOST`, `DEPLOY_USER`, SSH port, or auth method is missing, ask the user for it before deploying.
- Prefer SSH key authentication. Use a password only transiently to let the user authenticate or to configure an SSH public key.
- Do not infer credentials from old chat history. Reconfirm missing deployment details in the current task.

## Required Context

Collect these before running a real deploy:

- `DEPLOY_HOST`: cloud server IP or domain.
- `DEPLOY_USER`: SSH username.
- `DEPLOY_PORT`: SSH port, default `22`.
- Auth method: existing SSH key, identity file, or user-entered password.
- Target Go API port, default `8080`.
- Release retention, default `DEPLOY_KEEP_RELEASES=3`.
- BT Go project sync name, default `DEPLOY_BT_GO_PROJECT_NAME=reset_life`.

If the user wants details or troubleshooting, read `references/next-bt-node.md`.

## Workflow

1. Check repo state:

```bash
git status --short --branch
```

2. Set deployment variables in the current shell only.

PowerShell:

```powershell
$env:DEPLOY_HOST="<server-host>"
$env:DEPLOY_USER="<ssh-user>"
$env:DEPLOY_PORT="22"
```

Bash:

```bash
export DEPLOY_HOST="<server-host>"
export DEPLOY_USER="<ssh-user>"
export DEPLOY_PORT="22"
```

Set `DEPLOY_IDENTITY_FILE` only when the user provides a key path.

3. Validate locally:

```bash
npm run check
```

4. Dry-run the deploy command:

```bash
node scripts/deploy-cloud.mjs --skip-release --dry-run
```

If no release archive exists, continue with the real deploy; it will build one.

5. Deploy:

```bash
npm run deploy:cloud
```

6. The normal deploy command syncs a BT Go project row named `reset_life` unless `DEPLOY_BT_GO_PROJECT=0`.

This registers the running Go API for the BT Go project list, but keeps Nginx serving Astro static files directly and proxying only `/api/`.

7. Verify:

```bash
ssh <ssh-user>@<server-host> "readlink -f /www/wwwroot/reset-life/current"
ssh <ssh-user>@<server-host> "ss -ltnp | grep ':8080'"
```

Check the public site and API:

```bash
curl -I https://<domain>/
curl https://<domain>/api/healthz
```

## Project Contract

The project deploy script owns these conventions:

- fixed app root: `/www/wwwroot/reset-life`
- fixed current link: `/www/wwwroot/reset-life/current`
- shared SQLite database: `/www/wwwroot/reset-life/data/app.sqlite`
- static site root: `/www/wwwroot/reset-life/current/public`
- Go API binary: `/www/wwwroot/reset-life/current/api/resetlife-api`
- default Go API port: `8080`
- default BT Go project name: `reset_life`
- default release cleanup: keep the latest 3 `reset-life-go-astro-*` version directories; override with `DEPLOY_KEEP_RELEASES`

Do not manually reimplement these steps unless the script is broken. Fix `scripts/deploy-cloud.mjs` instead.
