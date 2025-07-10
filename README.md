## js-ratel-client

[![](https://img.shields.io/badge/license-Apache-blue)]() [![build status](https://img.shields.io/badge/build-passing-brightgreen)]() [![](https://img.shields.io/badge/javascript-%3E%3D%20ES6-brightgreen)]()

`js-ratel-client` 是一款运行在浏览器上的[ratel](https://github.com/ainilili/ratel)客户端。此客户端对原先的`ratel-client`功能进行了 100%还原。

并且与其他客户端相比，其具有以下特点：

1. 使用更加简单，无需下载编译客户端，最简便的方式仅仅是输入一个网址即可使用
2. 页面更加友好，借助`html` + `css`的强大渲染能力下，我们对展示界面进行了一些优化
3. 更好的隐蔽性，我们在页面上嵌入了百度等网页，你可以边打牌边假装查资料
4. 支持自定义化配置，打造你的专属页面
5. 支持聊天功能，聊天消息以'~'开头

另外需要强调的是：虽然此客户端使用`websocket`协议进行通信，但是可以和其他客户端用户一起游戏

> 此项目的桌面版本[electronjs-ratel-client](https://github.com/marmot-z/electronjs-ratel-client.git)

### Install

#### 下载

```shell
git clone https://github.com/marmot-z/js-ratel-client.git
cd js-ratel-client
```

#### 部署

##### 方式一：直接运行

1. 直接双击`index.html`使用浏览器打开页面进行游戏
2. 或者部署在`tomacat`、`jetty`等应用服务器或者`nginx`代理服务器上，可提供外部访问进行游戏
3. 或者访问 [http://ratel.isnico.com](http://ratel.isnico.com) 进行游戏

##### 方式二：Docker 部署（推荐）

**快速开始：**

```bash
# 构建并启动开发环境
make build
make run

# 访问 http://localhost:8889
```

**生产环境部署：**

```bash
# 构建生产镜像
make prod-build

# 启动生产环境
make prod-up

# 访问 http://localhost
```

**环境变量配置：**

```bash
# 使用自定义服务器地址构建
make build RATEL_SERVER_HOST=your.domain.com

# 使用 WSS 协议（HTTPS 环境必需）
make build RATEL_SERVER_HOST=your.domain.com BACKEND_USE=wss

# 完整参数示例
make build \
  RATEL_SERVER_HOST=ratel-be.youdomain.com\
  RATEL_SERVER_PORT=80 \
  RATEL_SERVER_NAME=MyServer \
  RATEL_SERVER_VERSION=v1.3.0 \
  BACKEND_USE=wss
```

**支持的环境变量：**

- `RATEL_SERVER_HOST`: 服务器地址（默认：ratel-be.youdomain.com）
- `RATEL_SERVER_PORT`: 服务器端口（默认：80）
- `RATEL_SERVER_NAME`: 服务器名称（默认：Nico）
- `RATEL_SERVER_VERSION`: 服务器版本（默认：v1.3.0）
- `BACKEND_USE`: WebSocket 协议类型，可选 `ws` 或 `wss`（默认：ws）
- `RATEL_IS_DEVELOPMENT`: 是否为开发环境（默认：false）

**更多 Docker 命令：**

```bash
make help          # 查看所有可用命令
make logs           # 查看日志
make shell          # 进入容器
make test           # 运行测试
make clean          # 清理资源
```

详细的 Docker 部署文档请参考：[部署文档](./docs/deployment.md)  
环境变量配置详情请参考：[环境变量配置说明](./docs/environment-variables.md)

### Usage

请看 [使用介绍](./usage.md)

### Roadmap

- 更友善的页面
  - 使用`css`优化页面显示
- 自定义配置，定制用户页面
  - 自定义嵌入页面，不仅仅是百度
  - 显示/隐藏 快捷键设置
  - 背景，字体自定义
- 浏览器兼容
- 用户聊天

### Contribution

- 如果你有发现什么问题请提[ISSUE](https://github.com/marmot-z/js-ratel-client/issues)
- 如果你有好的想法，欢迎提供[PR](https://github.com/marmot-z/js-ratel-client/pulls)
- 如果觉得有帮助，请给作者点个 :star: 吧，秋梨膏
