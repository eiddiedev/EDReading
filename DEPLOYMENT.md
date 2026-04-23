# GitHub Actions 自动部署

本项目已添加 GitHub Actions 工作流：[.github/workflows/deploy-to-server.yml](./.github/workflows/deploy-to-server.yml)。

## 工作流行为

- 当 `main` 或 `master` 分支发生 `push` 时自动执行
- 也支持在 GitHub Actions 页面手动触发
- Actions 会先本地执行 `npm ci` 和 `npm run build`
- 然后通过 `rsync --delete` 同步到服务器 `/www/wwwroot/EDReading`，避免服务器残留旧文件
- 最后在服务器删除旧 `.next`、重新执行 `npm ci` 和 `npm run build`，并通过 PM2 显式重启 `edreading` 进程

## 需要的 GitHub Secrets

在 GitHub 仓库 `Settings > Secrets and variables > Actions` 中添加：

- `SERVER_HOST`: 服务器 IP
- `SERVER_SSH_KEY`: 可登录服务器的私钥内容
- `SERVER_USER`: 登录用户，通常填 `root`
- `SERVER_PORT`: SSH 端口，默认 `22`，如果你改过端口就填实际值

## 服务器前置要求

服务器需要预先安装：

- Node.js 20.19+
- npm
- PM2

推荐执行：

```bash
npm install -g pm2
cd /www/wwwroot/EDReading
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

如果你之前已经手动启动过别的 PM2 任务名，建议先在服务器确认真正对外服务的是不是 `edreading`：

```bash
pm2 list
pm2 describe edreading
```

如果这里看到的不是当前项目目录 `/www/wwwroot/EDReading`，或者名字不是 `edreading`，就需要先清理旧进程后再重新启动。

## 环境变量

工作流不会上传这些文件：

- `.env.local`
- `.env.production`

因此你需要在服务器 `/www/wwwroot/EDReading` 下自行准备环境变量文件，例如 `.env.production`。

## 默认端口

PM2 配置文件 [ecosystem.config.cjs](./ecosystem.config.cjs) 默认让 Next.js 运行在 `3000` 端口。

如果你通过 Nginx、宝塔面板或其他反向代理对外提供服务，需要将域名转发到 `127.0.0.1:3000`。

## 常见问题排查

如果 GitHub Actions 显示部署成功，但线上还是旧版本，优先检查下面几项：

- `pm2 list` 里运行的是否真的是 `edreading`
- `pm2 describe edreading` 里的 `cwd` 是否为 `/www/wwwroot/EDReading`
- 服务器目录里是否存在新的 `.next` 构建产物：`ls -lah /www/wwwroot/EDReading/.next`
- 如果用了 Nginx / 宝塔，反代目标是否仍然指向 `127.0.0.1:3000`
- 浏览器是否命中了旧缓存，可以先强制刷新再看
