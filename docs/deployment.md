# Ratel 在线斗地主客户端 Docker 部署文档

## 项目概述

Ratel 在线斗地主客户端是一个基于 Web 技术构建的游戏客户端，支持与 Ratel 服务器进行 WebSocket 通信。本文档详细介绍如何使用 Docker 进行部署。

## 系统要求

- Docker 20.0+
- Docker Compose 1.29+ 或 Docker Compose V2
- 最小内存：256MB
- 推荐内存：512MB

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/marmot-z/js-ratel-client.git
cd js-ratel-client
```

### 2. 查看可用命令

```bash
make help
```

### 3. 启动开发环境

```bash
# 构建镜像
make build

# 启动服务
make run

# 查看日志
make logs
```

访问 http://localhost:8889 即可开始游戏。

### 4. 生产环境部署

```bash
# 构建生产镜像
make prod-build

# 启动生产环境
make prod-up
```

生产环境将在 http://localhost 提供服务。

## 详细配置

### 开发环境

开发环境使用 `docker-compose.yml` 配置文件，主要特点：

- 端口映射：8889:80
- 实时文件挂载，支持热重载
- 详细日志输出
- 开发友好的容器配置

### 生产环境

生产环境使用 `docker-compose.prod.yml` 配置文件，主要特点：

- 端口映射：80:80
- 资源限制：CPU 0.5 核，内存 256MB
- 自动重启：always
- 优化的性能配置

### 环境变量

| 变量名 | 默认值        | 说明     |
| ------ | ------------- | -------- |
| TZ     | Asia/Shanghai | 时区设置 |

## 服务管理

### 常用命令

```bash
# 启动服务
make run                # 开发环境
make prod-up           # 生产环境

# 停止服务
make stop              # 开发环境
make prod-down         # 生产环境

# 查看日志
make logs

# 进入容器
make shell

# 清理资源
make clean

# 运行测试
make test
```

### 健康检查

系统提供健康检查端点：

- **开发环境**：http://localhost:8889/health
- **生产环境**：http://localhost/health

返回 `healthy` 表示服务正常。

## 网络配置

### 端口说明

| 端口 | 环境 | 说明               |
| ---- | ---- | ------------------ |
| 8889 | 开发 | 游戏客户端访问端口 |
| 80   | 生产 | 游戏客户端访问端口 |

### 防火墙配置

确保以下端口已开放：

```bash
# 开发环境
sudo ufw allow 8889

# 生产环境
sudo ufw allow 80
```

## 日志管理

### 日志位置

- 容器内路径：`/var/log/nginx/`
- 持久化卷：`nginx-logs`

### 查看日志

```bash
# 实时查看所有日志
make logs

# 查看访问日志
docker exec ratel-client-dev tail -f /var/log/nginx/access.log

# 查看错误日志
docker exec ratel-client-dev tail -f /var/log/nginx/error.log
```

## 性能优化

### 1. 静态资源缓存

Nginx 配置了静态资源缓存：

- JS/CSS/图片文件缓存 1 年
- 启用 gzip 压缩
- 设置适当的缓存头

### 2. 资源限制

生产环境设置了资源限制：

```yaml
deploy:
  resources:
    limits:
      cpus: "0.5"
      memory: 256M
    reservations:
      cpus: "0.1"
      memory: 128M
```

### 3. 连接优化

- 启用 keepalive 连接
- 配置合适的工作进程数
- 使用 epoll 事件模型

## 故障排除

### 常见问题

1. **容器启动失败**

   ```bash
   # 查看详细日志
   make logs

       # 检查端口占用
    sudo netstat -tulpn | grep :8889
   ```

2. **访问返回 404**

   ```bash
   # 检查文件权限
   ls -la index.html

   # 重新构建镜像
   make clean && make build
   ```

3. **WebSocket 连接失败**
   - 检查游戏服务器地址配置
   - 确认防火墙设置
   - 查看浏览器控制台错误信息

### 调试命令

```bash
# 进入容器调试
make shell

# 测试服务连通性
make test

# 查看容器状态
docker ps -a

# 查看镜像信息
docker images | grep ratel-client
```

## 安全建议

1. **网络安全**

   - 使用 HTTPS（生产环境需要配置 SSL）
   - 配置适当的防火墙规则
   - 定期更新 Docker 镜像

2. **访问控制**

   - 考虑使用反向代理
   - 配置访问频率限制
   - 设置适当的 CORS 策略

3. **监控**
   - 配置日志监控
   - 设置健康检查告警
   - 监控资源使用情况

## 更新部署

### 更新流程

1. 拉取最新代码
2. 重新构建镜像
3. 重启服务

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
make clean && make build && make run
```

### 回滚操作

```bash
# 停止当前服务
make stop

# 切换到上一个版本
git checkout <previous-commit>

# 重新构建启动
make build && make run
```

## 监控和维护

### 定期维护

```bash
# 清理未使用的镜像
docker system prune -f

# 查看磁盘使用情况
df -h

# 查看容器资源使用
docker stats
```

### 备份重要数据

```bash
# 备份配置文件
cp docker-compose.yml docker-compose.yml.bak
cp nginx.conf nginx.conf.bak

# 备份日志
docker cp ratel-client-dev:/var/log/nginx ./logs-backup/
```

## 联系支持

如果在部署过程中遇到问题，请参考：

- [项目 GitHub](https://github.com/marmot-z/js-ratel-client)
- [使用文档](../usage.md)
- [开发文档](./development.md)
