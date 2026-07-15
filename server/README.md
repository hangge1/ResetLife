# Go API

这是个人站后续使用的 Go 后端骨架。当前只提供健康检查，后续会逐步迁移登录、跑步记录、健康记录、目标、提醒和设置等能力。

默认监听：

```bash
127.0.0.1:8080
```

环境变量：

```bash
API_ADDR=127.0.0.1:8080
DATA_DIR=/www/wwwroot/personal-site-data
```

运行：

```bash
go run ./cmd/api
```

健康检查：

```bash
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/api/healthz
```
