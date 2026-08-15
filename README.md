# JavdBviewed 发布中心

这里提供 JavdBviewed 各端产品的正式版本、下载入口和自部署镜像信息。

## 快速入口

- [产品文档](https://docs.we-together.club/)
- [浏览器扩展下载与安装](https://docs.we-together.club/download/)
- [Cloud 1.2.2 发布页](https://github.com/JavdBviewed/JavdBviewed-release/releases/tag/cloud-v1.2.2)
- [Cloud Compose 模板](./compose/cloud/compose.yaml)
- [Cloud 环境变量示例](./compose/cloud/.env.example)

## Cloud 自部署

Cloud 是运行在你自己的设备或服务器上的数据服务。它不会把数据库托管到 JavdBviewed，也不会自动替换或重启你的容器。

首次部署可以直接使用仓库中的 Compose 模板。

Linux 或 macOS：

```bash
mkdir javdbviewed-cloud
cd javdbviewed-cloud
curl -fsSLO https://raw.githubusercontent.com/JavdBviewed/JavdBviewed-release/main/compose/cloud/compose.yaml
curl -fsSLO https://raw.githubusercontent.com/JavdBviewed/JavdBviewed-release/main/compose/cloud/.env.example
mv .env.example .env
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory javdbviewed-cloud
Set-Location javdbviewed-cloud
Invoke-WebRequest https://raw.githubusercontent.com/JavdBviewed/JavdBviewed-release/main/compose/cloud/compose.yaml -OutFile compose.yaml
Invoke-WebRequest https://raw.githubusercontent.com/JavdBviewed/JavdBviewed-release/main/compose/cloud/.env.example -OutFile .env.example
Move-Item .env.example .env
```

编辑 `.env`，至少填写一个强随机的 `CLOUD_JWT_SECRET`，然后启动：

```bash
docker compose -f compose.yaml pull
docker compose -f compose.yaml up -d
docker compose -f compose.yaml logs --tail 100 cloud
```

模板默认使用 `ghcr.io/javdbviewed/javdbviewed-cloud:latest`。首次启动时如果没有设置 `CLOUD_ADMIN_PASSWORD`，请从日志中保存一次性临时密码，再使用固定账号 `admin` 登录并修改密码。

完整的目录准备、环境变量、HTTPS 反向代理、备份、升级和回滚步骤，请查看[文档站的 Cloud 部署指南](https://docs.we-together.club/download/#cloud-deploy)。

## 常用环境变量

| 变量 | 用途 |
| --- | --- |
| `CLOUD_IMAGE_NAME` | 镜像地址，默认使用 `:latest`；回滚时改为已验证的固定版本 tag。 |
| `CLOUD_JWT_SECRET` | 登录和设备令牌的签名密钥，生产环境必填且不要随意更换。 |
| `CLOUD_ADMIN_PASSWORD` | 首次管理员密码；留空时由服务生成并只在首次启动日志输出一次。 |
| `CLOUD_CORS_ORIGINS` | 浏览器 Origin 白名单，多个值使用英文逗号分隔。 |
| `CLOUD_UPDATE_MANIFEST_MIRRORS` | 更新清单加速地址，多个地址使用英文逗号分隔。 |

不要在公开 issue、截图、Compose 文件或仓库提交中暴露 JWT 密钥、管理员密码和 Cloud 数据目录。

## 当前版本

当前 Cloud `1.2.2` 已正式发布。查看[发布说明](https://github.com/JavdBviewed/JavdBviewed-release/releases/tag/cloud-v1.2.2)了解首次部署、升级和回滚步骤。

部署后可以访问 `/health`，或登录 Cloud 管理台确认服务、设备连接和同步状态。

## 其他产品

浏览器扩展和其他客户端的安装包、更新说明会在对应的 GitHub Release 和[文档站](https://docs.we-together.club/)提供。桌面端与 Android 客户端是否开放，以文档站的最新状态为准。

## 许可证

各产品的许可证以对应发布说明为准。Cloud 使用 AGPL-3.0-only；自部署的密码、网络暴露、备份和升级注意事项请查看[Cloud 部署指南](https://docs.we-together.club/download/#cloud-deploy)。
