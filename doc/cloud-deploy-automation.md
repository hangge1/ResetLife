# 云服务器自动化部署

目标服务器信息不写入代码仓库，需要部署时通过环境变量提供：

- `DEPLOY_HOST`：服务器公网 IP 或域名
- `DEPLOY_USER`：SSH 登录用户名
- `DEPLOY_ROOT`：部署根目录，默认 `/www/wwwroot`

脚本负责构建、上传、解压、安装生产依赖、执行 `prepare:bt`、切换当前版本并重启应用进程。
脚本会维护一个固定入口目录：

```bash
/www/wwwroot/slimming-assistant-current
```

以后宝塔项目可以固定配置到这个目录；每次部署时脚本会把它切换到最新版本目录。
用户数据会固定保存在共享目录：

```bash
/www/wwwroot/slimming-assistant-data/slimming-assistant.sqlite
```

不要把生产数据放在某个版本目录的 `data/` 下，否则切换版本时容易误以为账号或个人数据丢失。

## 推荐：先配置 SSH Key

不要把服务器密码写进仓库或脚本。建议在本机执行一次：

```bash
ssh-keygen -t ed25519 -C "slimming-assistant-deploy"
ssh-copy-id <ssh-user>@<server-host>
```

Windows 如果没有 `ssh-copy-id`，可以手动把本机 `~/.ssh/id_ed25519.pub` 内容追加到服务器：

```bash
/root/.ssh/authorized_keys
```

## 一键打包并部署

```bash
npm run deploy:cloud
```

流程：

1. 本地执行 `npm run release`
2. 上传最新 `dist/releases/*.tar.gz` 到 `/www/wwwroot`
3. 在服务器解压到 `/www/wwwroot/<release-folder>`
4. 在服务器执行 `npm run prepare:bt`
5. 更新 `/www/wwwroot/slimming-assistant-current` 指向新版本
6. 使用共享 SQLite 路径重启 `3000` 端口上的应用进程

`prepare:bt` 会自动处理：

- 生产依赖安装：`npm install --omit=dev`
- SQLite 迁移：`npm run db:migrate`
- Next 生产构建需要的 `better-sqlite3-*` 运行时别名

## 使用已有发布包部署

如果已经打过包，不想重新构建：

```bash
npm run deploy:cloud:skip-release
```

也可以指定包：

```bash
DEPLOY_ARCHIVE=dist/releases/slimming-assistant-0.1.0-xxx.tar.gz npm run deploy:cloud:skip-release
```

## 可配置环境变量

```bash
DEPLOY_HOST=<server-host>
DEPLOY_USER=<ssh-user>
DEPLOY_ROOT=/www/wwwroot
DEPLOY_PORT=22
DEPLOY_IDENTITY_FILE=~/.ssh/id_ed25519
DEPLOY_ARCHIVE=dist/releases/xxx.tar.gz
DEPLOY_CURRENT_LINK=/www/wwwroot/slimming-assistant-current
DEPLOY_DATA_ROOT=/www/wwwroot/slimming-assistant-data
DEPLOY_SQLITE_PATH=/www/wwwroot/slimming-assistant-data/slimming-assistant.sqlite
DEPLOY_APP_PORT=3000
DEPLOY_START_SCRIPT=start:bt:3000
DEPLOY_RESTART=1
```

示例：

PowerShell：

```powershell
$env:DEPLOY_HOST="<server-host>"
$env:DEPLOY_USER="<ssh-user>"
$env:DEPLOY_IDENTITY_FILE="$env:USERPROFILE\.ssh\id_ed25519"
npm run deploy:cloud
```

Bash：

```bash
export DEPLOY_HOST="<server-host>"
export DEPLOY_USER="<ssh-user>"
export DEPLOY_IDENTITY_FILE="$HOME/.ssh/id_ed25519"
npm run deploy:cloud
```

## 宝塔项目只需要配置一次

推荐把宝塔 Node 项目的根目录设置为：

```bash
/www/wwwroot/slimming-assistant-current
```

启动命令设置为：

```bash
npm run start:bt:3000
```

如果你仍然使用宝塔手动启动，建议在项目环境变量里设置：

```bash
SQLITE_PATH=/www/wwwroot/slimming-assistant-data/slimming-assistant.sqlite
```

以后不要再删除旧项目、添加新项目。执行：

```bash
npm run deploy:cloud
```

脚本会自动切换 `slimming-assistant-current` 并重启 `3000` 端口应用。

部署完成后，目标目录会输出：

```bash
/www/wwwroot/<release-folder>
```

如果临时不想让脚本重启应用，可以执行：

```bash
DEPLOY_RESTART=0 npm run deploy:cloud
```

旧版本目录会保留在 `/www/wwwroot` 下，必要时可以手动把 `slimming-assistant-current` 指回旧目录回滚：

```bash
ln -sfn /www/wwwroot/<old-release-folder> /www/wwwroot/slimming-assistant-current
```

不要把 `npm install`、`npm run build`、`npm run release` 放到宝塔启动命令里。
