# WebSocket Secure (WSS) 配置指南

本文档说明如何配置 Ratel 客户端使用 WSS（WebSocket Secure）协议连接后端服务器。

## 背景

当前端通过 HTTPS 访问时，浏览器会阻止页面中的非安全 WebSocket 连接（ws://）。这是浏览器的安全策略，称为混合内容（Mixed Content）限制。

## 配置方法

### 1. 使用 Make 命令构建

在构建时指定 `BACKEND_USE=wss` 参数：

```bash
# 开发环境
make build RATEL_SERVER_HOST=ratel-be.youdomain.com BACKEND_USE=wss
make run

# 生产环境
make prod-build RATEL_SERVER_HOST=ratel-be.youdomain.com BACKEND_USE=wss
make prod-up
```

### 2. 参数说明

- `BACKEND_USE`: 指定 WebSocket 协议类型
  - `ws`（默认）: 使用非加密的 WebSocket 协议
  - `wss`: 使用加密的 WebSocket Secure 协议

### 3. 完整示例

```bash
# 构建并运行使用 WSS 的客户端
sudo make build RATEL_SERVER_HOST=ratel-be.youdomain.com BACKEND_USE=wss
sudo make run

# 查看日志确认配置
make logs
```

## Cloudflare 配置要求

使用 WSS 时，需要确保：

1. **后端域名启用 Cloudflare 代理**
   - 在 Cloudflare DNS 设置中，确保后端域名（如 `ratel-be.youdomain.com`）的代理状态为启用（橙色云朵）

2. **SSL/TLS 设置**
   - 在 Cloudflare SSL/TLS 设置中，选择 "Flexible" 或 "Full" 模式
   - 不要选择 "Off" 或 "Full (strict)"

3. **WebSocket 支持**
   - Cloudflare 默认支持 WebSocket，无需额外配置

## 验证配置

### 1. 检查构建日志

```bash
make logs
```

应该看到类似输出：
```
正在配置 Ratel 客户端...
服务器地址: ratel-be.youdomain.com:80:Nico[v1.3.0]
WebSocket 地址: wss://ratel-be.youdomain.com/ws
WebSocket 协议: wss
开发环境: false
```

### 2. 浏览器开发者工具

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 过滤显示 WS 类型的请求
4. 刷新页面，应该看到 `wss://` 开头的 WebSocket 连接

### 3. 检查配置文件

进入容器查看生成的配置：

```bash
make shell
cat /usr/share/nginx/html/js/config.js
```

## 故障排除

### 问题 1：仍然显示 "ws://" 连接

**原因**：浏览器缓存了旧的配置文件

**解决方法**：
1. 清除浏览器缓存
2. 使用无痕/隐私模式访问
3. 强制刷新页面（Ctrl+F5）

### 问题 2：WebSocket 连接失败

**原因**：Cloudflare 配置不正确

**解决方法**：
1. 确认后端域名已启用 Cloudflare 代理
2. 检查 SSL/TLS 设置是否正确
3. 查看浏览器控制台的具体错误信息

### 问题 3：显示 "Mixed Content" 错误

**原因**：页面通过 HTTPS 访问，但 WebSocket 使用了 ws:// 协议

**解决方法**：
1. 确认使用了 `BACKEND_USE=wss` 参数重新构建
2. 检查容器是否已更新（可能需要先 `make clean`）

## 最佳实践

1. **HTTPS 环境必须使用 WSS**
   - 如果前端通过 HTTPS 访问，必须使用 `BACKEND_USE=wss`

2. **HTTP 环境可以使用 WS**
   - 如果前端通过 HTTP 访问，可以使用默认的 `ws` 协议

3. **统一使用 WSS**
   - 为了简化配置，建议生产环境统一使用 WSS 协议

## 相关文件

- `Makefile`: 构建配置
- `Dockerfile`: Docker 镜像定义
- `build.sh`: 构建脚本
- `js/config.js`: 前端配置文件（模板） 