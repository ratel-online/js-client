# Ratel 在线斗地主客户端开发文档

## 项目架构

### 技术栈

- **前端框架**：Vue.js 2.x
- **通信协议**：WebSocket
- **数据格式**：Protocol Buffers
- **构建工具**：原生 JavaScript（无构建工具）
- **部署方式**：Docker + Nginx

### 目录结构

```
js-client/
├── css/                    # 样式文件
│   ├── client.css         # 客户端样式
│   ├── console.css        # 控制台样式
│   └── mobile.css         # 移动端样式
├── js/                     # JavaScript 文件
│   ├── assets/            # 第三方资源
│   ├── handler/           # 事件处理器
│   ├── init.js            # 初始化脚本
│   ├── socket.js          # WebSocket 客户端
│   └── ...               # 其他功能模块
├── libs/                   # 第三方库
├── images/                # 图片资源
├── protoc/                # Protocol Buffers 定义
├── index.html             # 主页面
├── ws.html               # WebSocket 测试页面
├── Dockerfile            # Docker 构建文件
├── docker-compose.yml    # 开发环境配置
└── Makefile              # 构建管理脚本
```

## 开发环境搭建

### 1. 环境要求

- Docker 20.0+
- Docker Compose 1.29+
- 现代浏览器（Chrome/Firefox/Safari）
- 文本编辑器（VS Code 推荐）

### 2. 快速启动

```bash
# 克隆项目
git clone https://github.com/marmot-z/js-ratel-client.git
cd js-ratel-client

# 启动开发环境
make build
make run

# 查看运行状态
make logs
```

### 3. 开发服务器

开发环境启动后，服务会运行在：

- **游戏客户端**：http://localhost:8889
- **健康检查**：http://localhost:8889/health

### 4. 实时开发

开发环境支持实时文件修改：

```bash
# 修改文件后，刷新浏览器即可看到变化
# 无需重启容器
```

## 核心模块说明

### 1. 初始化模块 (`js/init.js`)

负责应用的初始化和服务器连接：

```javascript
// 服务器配置
var existingServerList = ["ratel-be.youdomain.com:80:Nico[v1.3.0]"];

// 启动连接
function start(host, port) {
  var wsUrl = "ws://" + host + ":" + port + "/ws";
  window.wsClient = new WsClient(wsUrl);
  // ...
}
```

### 2. WebSocket 客户端 (`js/socket.js`)

处理与服务器的 WebSocket 通信：

```javascript
// Vue 实例管理 WebSocket 连接
var Vm = new Vue({
  data: {
    address: "ws://ratel-be.youdomain.com/ws",
    nickname: "luke",
    connected: false,
    // ...
  },
  methods: {
    autoWsConnect: function () {
      // WebSocket 连接逻辑
    },
    sendData: function (data) {
      // 发送数据到服务器
    },
  },
});
```

### 3. 事件处理器 (`js/handler/`)

处理各种游戏事件：

- `clientConnectEventHandler.js` - 客户端连接事件
- `gameStartingEventHandler.js` - 游戏开始事件
- `gamePokerPlayEventHandler.js` - 扑克牌游戏事件
- 等等...

### 4. 协议定义 (`protoc/`)

定义客户端和服务器之间的通信协议：

- `ClientTransferDataProtoc.proto` - 客户端数据传输协议
- `ServerTransferDataProtoc.proto` - 服务器数据传输协议

## 开发指南

### 1. 添加新功能

1. **创建功能模块**

   ```bash
   touch js/newFeature.js
   ```

2. **在 index.html 中引入**

   ```html
   <script type="text/javascript" src="js/newFeature.js"></script>
   ```

3. **实现功能逻辑**

   ```javascript
   (function (window) {
     "use strict";

     function NewFeature() {
       // 功能实现
     }

     window.NewFeature = NewFeature;
   })(window);
   ```

### 2. 添加事件处理器

1. **创建处理器文件**

   ```bash
   touch js/handler/newEventHandler.js
   ```

2. **实现事件处理逻辑**

   ```javascript
   function handleNewEvent(data) {
     // 处理事件逻辑
     console.log("处理新事件:", data);
   }
   ```

3. **在主处理器中注册**
   ```javascript
   // 在 js/handler/handler.js 中添加
   eventHandlers["NEW_EVENT"] = handleNewEvent;
   ```

### 3. 修改样式

样式文件位于 `css/` 目录：

- `client.css` - 主要客户端样式
- `console.css` - 控制台样式
- `mobile.css` - 移动端适配

### 4. 配置服务器地址

在 `js/init.js` 中修改服务器列表：

```javascript
var existingServerList = ["your-server.com:port:Name[version]"];
```

## 调试指南

### 1. 浏览器调试

1. **打开开发者工具**

   - Chrome: F12 或 Ctrl+Shift+I
   - Firefox: F12 或 Ctrl+Shift+I

2. **查看控制台输出**

   ```javascript
   // 在代码中添加调试信息
   console.log("调试信息:", data);
   console.warn("警告信息:", warning);
   console.error("错误信息:", error);
   ```

3. **网络调试**
   - 在 Network 标签页查看 WebSocket 连接
   - 检查静态资源加载情况

### 2. 容器调试

```bash
# 查看容器日志
make logs

# 进入容器调试
make shell

# 查看 nginx 配置
docker exec ratel-client-dev cat /etc/nginx/nginx.conf

# 检查文件权限
docker exec ratel-client-dev ls -la /usr/share/nginx/html/
```

### 3. WebSocket 调试

1. **使用浏览器 WebSocket 调试**

   ```javascript
   // 在浏览器控制台中
   var ws = new WebSocket("ws://localhost:8889/ws");
   ws.onopen = function (e) {
     console.log("连接成功");
   };
   ws.onmessage = function (e) {
     console.log("收到消息:", e.data);
   };
   ```

2. **使用 WebSocket 测试页面**
   - 访问 http://localhost:8889/ws.html
   - 测试 WebSocket 连接和消息发送

## 测试

### 1. 单元测试

项目目前没有单元测试，建议添加：

```bash
# 创建测试目录
mkdir tests

# 添加测试文件
touch tests/test-init.js
touch tests/test-socket.js
```

### 2. 集成测试

使用 Make 命令运行集成测试：

```bash
# 运行所有测试
make test

# 测试特定功能
curl -f http://localhost:8889/health
```

### 3. 手动测试

1. **功能测试清单**

   - [ ] 页面正常加载
   - [ ] WebSocket 连接成功
   - [ ] 用户输入昵称
   - [ ] 游戏功能正常
   - [ ] 聊天功能正常

2. **浏览器兼容性测试**
   - Chrome (推荐)
   - Firefox
   - Safari
   - Edge

## 部署流程

### 1. 开发环境部署

```bash
# 启动开发环境
make run

# 修改代码后刷新浏览器即可
```

### 2. 生产环境部署

```bash
# 构建生产镜像
make prod-build

# 部署到生产环境
make prod-up
```

### 3. 版本发布

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0

# 构建发布版本
docker build -t ratel-client:v1.0.0 .
```

## 性能优化

### 1. 静态资源优化

- 使用 CDN 加速第三方库
- 启用 gzip 压缩
- 设置适当的缓存策略

### 2. 代码优化

- 减少全局变量使用
- 优化 DOM 操作
- 使用事件委托

### 3. 网络优化

- 减少 HTTP 请求
- 使用 WebSocket 连接池
- 实现断线重连机制

## 常见问题

### 1. 容器启动失败

**问题**：容器无法启动

**解决方案**：

```bash
# 检查端口占用
sudo netstat -tulpn | grep :8889

# 检查 Docker 服务
sudo systemctl status docker

# 重新构建镜像
make clean && make build
```

### 2. WebSocket 连接失败

**问题**：无法连接到游戏服务器

**解决方案**：

1. 检查服务器地址配置
2. 确认防火墙设置
3. 查看浏览器控制台错误

### 3. 静态资源加载失败

**问题**：CSS/JS 文件加载失败

**解决方案**：

```bash
# 检查文件权限
ls -la css/ js/

# 检查 nginx 配置
docker exec ratel-client-dev nginx -t
```

## 贡献指南

### 1. 代码规范

- 使用 4 个空格缩进
- 函数和变量使用驼峰命名
- 添加适当的注释

### 2. 提交规范

```bash
# 提交格式
git commit -m "feat: 添加新功能"
git commit -m "fix: 修复 WebSocket 连接问题"
git commit -m "docs: 更新开发文档"
```

### 3. 分支管理

- `main` - 主分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 热修复分支

## 参考资料

- [Ratel 服务器项目](https://github.com/ainilili/ratel)
- [WebSocket API 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Vue.js 官方文档](https://vuejs.org/)
- [Protocol Buffers 文档](https://developers.google.com/protocol-buffers)
