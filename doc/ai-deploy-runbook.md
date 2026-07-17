# AI 自动化部署执行手册

本手册用于让 AI 或维护者在任意电脑拉取最新代码后，按同一套流程完成部署。

本项目同时提供项目内 Codex Skill：

```bash
.codex/skills/cloud-ssh-deploy
```

如果当前 Codex 环境不会自动发现项目内 Skill，可以直接要求 AI：

```text
请使用项目内 .codex/skills/cloud-ssh-deploy 这个 Skill 执行云端部署。
```

## 安全原则

- 不要把服务器用户名、密码、私钥、面板地址、面板 token 写入仓库。
- 不要把密码写进脚本、文档、提交信息、`.env` 示例或命令历史。
- 优先使用 SSH Key。密码只用于用户本人输入，或一次性配置 SSH Key。
- AI 如果缺少部署信息，必须先反问用户，不要猜测。

## AI 开始前必须确认

如果上下文里没有这些信息，先问用户补全：

1. `DEPLOY_HOST`：服务器公网 IP 或域名。
2. `DEPLOY_USER`：SSH 登录用户名。
3. `DEPLOY_PORT`：SSH 端口，默认 `22`。
4. 认证方式：本机是否已有 SSH Key；如果没有，让用户输入密码完成 SSH Key 配置。
5. `DEPLOY_APP_ROOT`：应用根目录，默认 `/www/wwwroot/reset-life`。
6. `DEPLOY_APP_PORT`：Go API 监听端口，默认 `8080`。
7. `DEPLOY_KEEP_RELEASES`：部署后保留的最近版本目录数量，默认 `3`。

不要要求用户把密码写入文件。需要密码时，说明只用于当前 SSH 连接或让用户在终端提示中输入。

## 新电脑首次准备

拉取代码后安装依赖：

```bash
npm install
```

确认本机有 SSH 客户端：

```bash
ssh -V
scp -V
```

推荐配置 SSH Key：

```bash
ssh-keygen -t ed25519 -C "reset-life-deploy"
ssh-copy-id <ssh-user>@<server-host>
```

Windows 如果没有 `ssh-copy-id`，把本机公钥内容追加到服务器：

```bash
~/.ssh/id_ed25519.pub
```

服务器目标文件：

```bash
/root/.ssh/authorized_keys
```

如果 SSH 用户不是 `root`，目标路径应换成该用户的 home 目录下 `.ssh/authorized_keys`。

## 设置部署变量

PowerShell：

```powershell
$env:DEPLOY_HOST="<server-host>"
$env:DEPLOY_USER="<ssh-user>"
$env:DEPLOY_PORT="22"
$env:DEPLOY_IDENTITY_FILE="$env:USERPROFILE\.ssh\id_ed25519"
```

Bash：

```bash
export DEPLOY_HOST="<server-host>"
export DEPLOY_USER="<ssh-user>"
export DEPLOY_PORT="22"
export DEPLOY_IDENTITY_FILE="$HOME/.ssh/id_ed25519"
```

可选变量：

```bash
DEPLOY_ROOT=/www/wwwroot/reset-life/releases
DEPLOY_APP_ROOT=/www/wwwroot/reset-life
DEPLOY_CURRENT_LINK=/www/wwwroot/reset-life/current
DEPLOY_DATA_ROOT=/www/wwwroot/reset-life/data
DEPLOY_SQLITE_PATH=/www/wwwroot/reset-life/data/app.sqlite
DEPLOY_APP_PORT=8080
DEPLOY_RESTART=1
DEPLOY_KEEP_RELEASES=3
DEPLOY_BT_GO_PROJECT=1
DEPLOY_BT_GO_PROJECT_NAME=reset_life
```

## 部署前检查

```bash
git status --short --branch
npm run check
node scripts/deploy-cloud.mjs --skip-release --dry-run
```

如果没有现成发布包，`--skip-release --dry-run` 可能提示缺少 release 包，这是正常的。正式部署会先构建。

## 正式部署

```bash
npm run deploy:cloud
```

脚本会自动执行：

1. 本地构建发布包。
2. 上传到服务器 `/www/wwwroot/reset-life/releases`，或 `DEPLOY_ROOT` 指定的目录。
3. 解压到独立版本目录。
4. 复用上一版 `.env`，或按环境变量生成新的 `.env`。
5. 更新 `/www/wwwroot/reset-life/current` 指向新版本。
6. 重启 `DEPLOY_APP_PORT` 上的 Go API。
7. 请求 `http://127.0.0.1:8080/api/healthz` 验证服务。
8. 同步宝塔 Go 项目记录和 PID，默认项目名 `reset_life`。
9. 删除旧发布目录和残留压缩包，只保留最近 `DEPLOY_KEEP_RELEASES` 个 `reset-life-go-astro-*` 目录。

## 部署后验证

确认固定入口目录：

```bash
ssh <ssh-user>@<server-host> "readlink -f /www/wwwroot/reset-life/current"
```

确认应用进程：

```bash
ssh <ssh-user>@<server-host> "ss -ltnp | grep ':8080'"
```

确认公网访问：

```bash
curl -I https://<your-domain>/
curl -I https://<your-domain>/state/
curl https://<your-domain>/api/healthz
```

确认宝塔 Go 项目列表状态时，可以通过面板查看 `reset_life`，也可以在服务器上执行：

```bash
cd /www/server/panel && /www/server/panel/pyenv/bin/python - <<'PY'
import sys,json
sys.path.insert(0, '/www/server/panel/class')
import public
from projectModel.goModel import main
m=main()
row=m.get_project_list(public.to_dict_obj({'p':1,'limit':20,'order':'id desc'}))['data'][0]
print(json.dumps({'name': row['name'], 'run': row['run'], 'listen': row['listen'], 'listen_ok': row['listen_ok']}, ensure_ascii=False))
PY
```

## 常见问题

如果脚本提示缺少 `DEPLOY_HOST` 或 `DEPLOY_USER`，让用户补充服务器地址和 SSH 用户名，然后设置环境变量再执行。

## 宝塔 Go 项目同步

如果用户说“宝塔 Go 项目列表看不到网站”“Go 项目列表为空”“重新添加宝塔 Go 项目”，优先执行正常部署：

```bash
npm run deploy:cloud
```

部署脚本默认会同步 `reset_life` Go 项目记录，并写入 `/var/tmp/gopids/reset_life.pid`。这一步只用于让宝塔面板可见和读取运行状态，不用于覆盖域名 Nginx 配置。

当前生产 Nginx 约定：

```text
root /www/wwwroot/reset-life/current/public
/api/ -> http://127.0.0.1:8080
```

不要把宝塔 Go 模板改成整站反代到 Go。当前 Astro 静态文件应由 Nginx 直接服务，Go API 只承接 `/api/`。

如果 SSH 提示密码，优先让用户配置 SSH Key。不要把密码写入仓库。

如果用户数据像丢失，检查应用是否使用共享数据库：

```bash
/www/wwwroot/reset-life/data/app.sqlite
```

如果域名仍然显示旧站，优先检查对应 Nginx vhost 是否仍然反代到旧端口，例如 `127.0.0.1:3000`。当前旧 Node 端口不应继续运行：

```bash
ss -ltnp | grep -E ':3000|:8080'
```
