# 环境变量配置说明

## 概述

Ratel 客户端现在支持通过环境变量配置服务器地址，而不需要修改源代码。这使得在不同环境中部署变得更加灵活。

## 支持的环境变量

| 环境变量               | 描述                   | 默认值                   | 示例               |
| ---------------------- | ---------------------- | ------------------------ | ------------------ |
| `RATEL_SERVER_HOST`    | 服务器主机名或 IP 地址 | `ratel-be.youdomain.com` | `game.example.com` |
| `RATEL_SERVER_PORT`    | 服务器端口号           | `80`                     | `8080`             |
| `RATEL_SERVER_NAME`    | 服务器名称             | `Nico`                   | `GameServer`       |
| `RATEL_SERVER_VERSION` | 服务器版本             | `v1.3.0`                 | `v2.0.0`           |
| `RATEL_IS_DEVELOPMENT` | 是否为开发环境         | `false`                  | `true`             |

## 使用方法

### 1. 使用 Make 命令

#### 开发环境

```bash
# 使用默认配置构建
make build

# 使用自定义服务器地址构建
make build RATEL_SERVER_HOST=your.domain.com

# 使用自定义端口构建
make build RATEL_SERVER_HOST=your.domain.com RATEL_SERVER_PORT=8080

# 启动开发环境
make run
```

#### 生产环境

```bash
# 构建生产镜像
make prod-build RATEL_SERVER_HOST=prod.domain.com

# 启动生产环境
make prod-up
```

### 2. 使用 Docker 命令

```bash
# 直接使用 docker build
docker build \
  --build-arg RATEL_SERVER_HOST=your.domain.com \
  --build-arg RATEL_SERVER_PORT=8080 \
  --build-arg RATEL_SERVER_NAME=MyServer \
  --build-arg RATEL_SERVER_VERSION=v2.0.0 \
  --build-arg RATEL_IS_DEVELOPMENT=true \
  -t ratel-client:latest .

# 使用 docker run
docker run -d \
  -e RATEL_SERVER_HOST=your.domain.com \
  -e RATEL_SERVER_PORT=8080 \
  -p 80:80 \
  ratel-client:latest
```

### 3. 使用 Docker Compose

在 `docker-compose.yml` 文件中添加环境变量：

```yaml
version: "3.8"
services:
  ratel-client:
    build:
      context: .
      args:
        RATEL_SERVER_HOST: your.domain.com
        RATEL_SERVER_PORT: 8080
        RATEL_SERVER_NAME: MyServer
        RATEL_SERVER_VERSION: v2.0.0
        RATEL_IS_DEVELOPMENT: true
    environment:
      - RATEL_SERVER_HOST=your.domain.com
      - RATEL_SERVER_PORT=8080
    ports:
      - "80:80"
```

## 配置文件

系统会自动生成 `js/config.js` 文件，包含以下内容：

```javascript
window.RatelConfig = {
  serverAddress: "your.domain.com:8080:MyServer[v2.0.0]",
  wsAddress: "ws://your.domain.com:8080/ws",
  isDevelopment: true,
};
```

## 注意事项

1. **端口 80**: 当端口为 80 时，WebSocket 地址会自动省略端口号
2. **构建时替换**: 配置在构建时替换，运行时不能修改
3. **默认值**: 所有环境变量都有默认值，可以部分覆盖
4. **版本格式**: 版本需要使用 `v` 前缀，如 `v1.3.0`

## 示例场景

### 开发环境

```bash
make build RATEL_SERVER_HOST=localhost RATEL_SERVER_PORT=1025 RATEL_IS_DEVELOPMENT=true
```

### 测试环境

```bash
make build RATEL_SERVER_HOST=test.example.com RATEL_SERVER_PORT=8080
```

### 生产环境

```bash
make prod-build RATEL_SERVER_HOST=game.example.com RATEL_SERVER_PORT=80
```

## 验证配置

构建完成后，可以通过以下方式验证配置：

1. 查看浏览器控制台中的 `window.RatelConfig` 对象
2. 检查容器日志中的配置信息
3. 访问 `/js/config.js` 文件查看生成的配置

## 故障排除

如果遇到连接问题，请检查：

1. 环境变量是否正确设置
2. 服务器地址和端口是否可访问
3. 防火墙配置是否正确
4. WebSocket 协议是否支持（HTTP/HTTPS）
