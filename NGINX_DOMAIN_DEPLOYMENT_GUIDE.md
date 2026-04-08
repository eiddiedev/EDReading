# EDReading 域名 + Nginx + HTTPS 部署教程

这份教程是给小白准备的。

目标是把你现在这种：

```text
http://服务器IP:3000
```

改成更标准的线上部署方式：

```text
https://你的域名
```

背后的实际结构是：

```text
浏览器 --> Nginx --> 127.0.0.1:3000 --> Next.js (EDReading)
```

## 1. 先回答你的核心问题

### 现在的代码支持改用 Nginx 和域名吗

支持。

原因有三个：

1. 项目没有写死你自己的站点域名。
2. 登录回调地址是根据当前访问地址动态生成的。
3. 认证 cookie 已经改成按实际访问协议处理，兼容 HTTP 和 HTTPS。

这意味着：

- 你现在用 `IP + 端口` 可以跑
- 以后切换成 `域名 + Nginx + HTTPS` 也可以跑

你主要需要做的是服务器配置，不是重写项目代码。

## 2. 你要先准备什么

开始前，你至少需要下面这些东西：

### 必需

- 一台已经能运行项目的服务器
- 项目已经能在服务器上通过 `pm2` 或 `npm start` 跑起来
- 一个域名

### 强烈建议

- 这个域名已经完成备案
  说明：如果你的服务器在中国大陆，域名通常需要备案后才能正常使用
- 服务器已经开放 `80` 和 `443` 端口

## 3. 你当前部署和目标部署有什么区别

### 你现在

```text
浏览器 --> 服务器公网IP:3000 --> Next.js
```

问题是：

- 不够标准
- 不方便配置 HTTPS
- 登录态和 cookie 更容易出兼容问题
- 暴露了应用实际运行端口

### 目标方式

```text
浏览器 --> 域名:443(HTTPS) --> Nginx --> 127.0.0.1:3000 --> Next.js
```

好处是：

- 用户只访问域名，不访问 3000 端口
- HTTPS 更容易配置
- 登录 cookie 更稳定
- 更适合正式上线

## 4. 整体步骤概览

你要做的事情可以理解成 6 步：

1. 购买并准备域名
2. 给域名解析到你的服务器 IP
3. 在服务器安装 Nginx
4. 让 Next.js 继续跑在 `3000` 端口
5. 配置 Nginx 把域名请求转发到 `127.0.0.1:3000`
6. 给域名配置 HTTPS 证书

## 5. 第一步：确认项目继续跑在 3000 端口

你项目当前已经是这种模式。

`ecosystem.config.cjs` 里配置的是：

```js
env: {
  NODE_ENV: "production",
  PORT: 3000,
}
```

也就是说：

- Next.js 仍然跑在 `3000`
- 这个不需要改成 80 或 443
- 因为 80/443 应该交给 Nginx

你只要确保项目在服务器上是正常运行的。

例如：

```bash
cd /www/wwwroot/EDReading
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 list
```

如果 `pm2 list` 里显示 `edreading` 在线，就说明应用层基本正常。

## 6. 第二步：准备域名并解析到服务器

你需要到你的域名服务商后台做 DNS 解析。

假设：

- 你的服务器公网 IP 是 `1.2.3.4`
- 你的域名是 `example.com`

那通常至少要加一条解析：

- 记录类型：`A`
- 主机记录：`@`
- 记录值：`1.2.3.4`

如果你还想让 `www.example.com` 也能访问，再加一条：

- 记录类型：`A`
- 主机记录：`www`
- 记录值：`1.2.3.4`

解析生效后，你应该可以通过：

```text
http://example.com
```

访问到你的服务器。

注意：这一步只是把域名指向服务器，还没有接入 Nginx，也还没有 HTTPS。

## 7. 第三步：安装 Nginx

如果你的服务器是常见 Linux 发行版，可以先试：

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y nginx
```

### CentOS / Rocky / AlmaLinux

```bash
sudo yum install -y nginx
```

安装完成后，启动 Nginx：

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

如果状态是 `active (running)`，说明 Nginx 正常。

## 8. 第四步：开放防火墙端口

你至少要开放这些端口：

- `80`：HTTP
- `443`：HTTPS
- `3000`：只在你调试时需要外部直连，正式上线后可以考虑不开放公网

如果你用的是云服务器，还要检查云平台安全组。

也就是说你要同时检查两层：

- 服务器系统防火墙
- 云厂商控制台安全组

## 9. 第五步：写 Nginx 反向代理配置

这是最关键的一步。

### 反代是什么意思

就是：

- 用户访问的是你的域名
- Nginx 接收请求
- Nginx 再把请求转发给 `127.0.0.1:3000`

### 一个最基础的 Nginx 配置示例

假设你的域名是 `example.com`，可以先写：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 这几个头为什么重要

尤其是下面这行很重要：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

它告诉后面的 Next.js：

- 当前用户访问的是 `http`
- 还是 `https`

这个信息会影响认证 cookie 的行为。  
如果少了它，登录系统在某些部署场景下就容易出问题。

## 10. 第六步：把 Nginx 配置文件放到哪里

不同系统位置略有不同，常见是：

### Ubuntu / Debian

站点配置一般放在：

```text
/etc/nginx/sites-available/
```

启用方式一般是软链接到：

```text
/etc/nginx/sites-enabled/
```

例如：

```bash
sudo nano /etc/nginx/sites-available/edreading
```

粘贴上面的配置后，执行：

```bash
sudo ln -s /etc/nginx/sites-available/edreading /etc/nginx/sites-enabled/edreading
sudo nginx -t
sudo systemctl reload nginx
```

### CentOS 系

常见位置是：

```text
/etc/nginx/conf.d/
```

例如：

```bash
sudo nano /etc/nginx/conf.d/edreading.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 11. 第七步：先验证 HTTP 反代是否成功

这一步先不要急着上 HTTPS。

先确认：

```text
http://你的域名
```

已经可以正常打开网站。

如果此时能打开，说明链路已经通了：

```text
域名 --> Nginx --> Next.js
```

如果打不开，优先排查：

- 域名解析是否生效
- Nginx 是否启动
- Nginx 配置是否写错
- 80 端口是否放行
- PM2 里的 Next.js 是否真的跑在 3000

## 12. 第八步：申请 HTTPS 证书

正式上线建议一定加 HTTPS。

最常见是用 Let's Encrypt 免费证书。

### Ubuntu / Debian 常见方式

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

### CentOS 系常见方式

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

执行后按提示操作，成功的话 Certbot 会自动帮你：

- 配置证书
- 修改 Nginx
- 让 HTTP 跳转到 HTTPS

## 13. HTTPS 配好后，理想的 Nginx 配置长什么样

通常会变成类似这样：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 14. 第九步：Supabase 里需要改什么

你用了 Supabase 登录，所以切换域名后，还要同步检查 Supabase 项目的认证配置。

通常要检查：

- Site URL
- Redirect URLs

你至少要把正式访问地址加入允许列表。

例如：

```text
https://example.com
https://www.example.com
https://example.com/auth/callback
https://www.example.com/auth/callback
```

因为你的注册和登录回调依赖：

- 当前站点 origin
- `/auth/callback`

如果 Supabase 后台没有允许这些地址，邮箱验证和回调登录可能失败。

## 15. 第十步：服务器环境变量要保持正确

服务器上你仍然需要这些环境变量：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AI_API_KEY=... 或 DEEPSEEK_API_KEY=...
AI_BASE_URL=...
AI_MODEL=...
```

如果你现在是用 `.env.production`，那就继续保持。  
如果是 PM2 注入环境变量，也可以。

重点是：

- 切换到域名和 Nginx 并不会替代这些变量
- 它们和 Nginx 是两件事

## 16. 第十一步：部署后怎么验证登录是否正常

部署完成后，按这个顺序验证：

1. 访问 `https://你的域名`
2. 打开设置页
3. 登录
4. 切换到别的页面
5. 再切回设置页
6. 刷新页面
7. 确认仍然保持登录

如果还要更细一点，就打开浏览器开发者工具：

1. 按 `F12`
2. 打开 `Application`
3. 找到 `Cookies`
4. 查看是否存在 `sb-edreading-auth-token`

理想情况：

- 登录后 cookie 存在
- 页面切换后 cookie 还在
- 刷新后 cookie 还在

## 17. 常见错误和你该怎么理解

### 错误 1：域名打不开

通常是：

- DNS 没生效
- 80/443 没放行
- Nginx 没启动

### 错误 2：Nginx 打开的是默认欢迎页

说明：

- 你的站点配置没生效
- 或者默认站点抢先匹配了

### 错误 3：502 Bad Gateway

通常是：

- Next.js 没跑起来
- PM2 挂了
- `proxy_pass` 指错端口

### 错误 4：登录成功但切页后掉登录

优先检查：

- 是否真的在走 HTTPS
- Nginx 是否带了 `X-Forwarded-Proto`
- 浏览器里 `sb-edreading-auth-token` 是否存在

## 18. 你现在最现实的操作顺序

如果你是第一次搞这一套，我建议你按这个顺序来：

1. 先保持项目继续跑在 `3000`
2. 买一个域名并解析到服务器
3. 安装 Nginx
4. 先把 HTTP 反代跑通
5. 确认域名可以访问网站
6. 再上 HTTPS
7. 最后检查 Supabase 的回调地址设置

这个顺序最稳，因为每一步出错时都容易定位。

## 19. 对你当前项目的结论

一句话总结：

这套代码已经支持你切换到 `Nginx + 域名 + HTTPS`。

你现在缺的不是代码兼容性，而是：

- 域名
- DNS 解析
- Nginx 配置
- HTTPS 证书
- Supabase 回调地址同步配置

## 20. 建议

如果你准备长期使用这个项目，建议尽快切到：

```text
域名 + Nginx + HTTPS
```

原因很实际：

- 更稳定
- 更安全
- 登录态更稳
- 后面出问题更容易排查
- 更接近正式上线环境

