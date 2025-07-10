.PHONY: help build run stop clean logs shell test prod-build prod-up prod-down redeploy prod-redeploy

# 检测 Docker Compose 命令
DOCKER_COMPOSE := $(shell which docker-compose 2>/dev/null)
ifeq ($(DOCKER_COMPOSE),)
    DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "")
endif
ifeq ($(DOCKER_COMPOSE),)
    $(error "Docker Compose 未安装。请安装 docker-compose 或升级到支持 'docker compose' 的 Docker 版本")
endif

# 环境变量配置
RATEL_SERVER_HOST ?= ratel-be.youdomain.com
RATEL_SERVER_PORT ?= 80
RATEL_SERVER_NAME ?= Nico
RATEL_SERVER_VERSION ?= v1.3.0
RATEL_IS_DEVELOPMENT ?= false
BACKEND_USE ?= ws

# 构建参数
BUILD_ARGS := --build-arg RATEL_SERVER_HOST=$(RATEL_SERVER_HOST) \
              --build-arg RATEL_SERVER_PORT=$(RATEL_SERVER_PORT) \
              --build-arg RATEL_SERVER_NAME=$(RATEL_SERVER_NAME) \
              --build-arg RATEL_SERVER_VERSION=$(RATEL_SERVER_VERSION) \
              --build-arg RATEL_IS_DEVELOPMENT=$(RATEL_IS_DEVELOPMENT) \
              --build-arg BACKEND_USE=$(BACKEND_USE)

# 默认目标
help:
	@echo "Ratel 在线斗地主客户端 Docker 管理命令"
	@echo ""
	@echo "当前使用的 Docker Compose 命令: $(DOCKER_COMPOSE)"
	@echo ""
	@echo "开发环境命令:"
	@echo "  make build       - 构建Docker镜像"
	@echo "  make run         - 启动开发环境"
	@echo "  make stop        - 停止开发环境"
	@echo "  make redeploy    - 重新部署（停止、构建、启动）"
	@echo "  make logs        - 查看日志"
	@echo "  make shell       - 进入容器shell"
	@echo "  make clean       - 清理容器和镜像"
	@echo ""
	@echo "生产环境命令:"
	@echo "  make prod-build  - 构建生产镜像"
	@echo "  make prod-up     - 启动生产环境"
	@echo "  make prod-down   - 停止生产环境"
	@echo "  make prod-redeploy - 重新部署生产环境"
	@echo ""
	@echo "环境变量配置:"
	@echo "  RATEL_SERVER_HOST=$(RATEL_SERVER_HOST)"
	@echo "  RATEL_SERVER_PORT=$(RATEL_SERVER_PORT)"
	@echo "  RATEL_SERVER_NAME=$(RATEL_SERVER_NAME)"
	@echo "  RATEL_SERVER_VERSION=$(RATEL_SERVER_VERSION)"
	@echo "  RATEL_IS_DEVELOPMENT=$(RATEL_IS_DEVELOPMENT)"
	@echo "  BACKEND_USE=$(BACKEND_USE) (ws 或 wss)"
	@echo ""
	@echo "使用示例:"
	@echo "  make build RATEL_SERVER_HOST=your.domain.com"
	@echo "  make run RATEL_SERVER_HOST=ratel-be.youdomain.com BACKEND_USE=wss"
	@echo "  make redeploy RATEL_SERVER_HOST=ratel-be.youdomain.com BACKEND_USE=wss"
	@echo "  make prod-build RATEL_SERVER_HOST=prod.domain.com RATEL_SERVER_PORT=8080"
	@echo ""
	@echo "测试命令:"
	@echo "  make test        - 运行测试"

# 开发环境命令
build:
	$(DOCKER_COMPOSE) build $(BUILD_ARGS)

run:
	$(DOCKER_COMPOSE) up -d
	@echo "开发环境已启动："
	@echo "  游戏客户端: http://localhost:8889"
	@echo "  健康检查: http://localhost:8889/health"

stop:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

shell:
	$(DOCKER_COMPOSE) exec ratel-client sh

clean:
	$(DOCKER_COMPOSE) down -v
	docker rmi ratel-client:latest || true
	docker system prune -f

# 重新部署命令 - 停止、重新构建、启动
redeploy: stop build run
	@echo ""
	@echo "=== 重新部署完成 ==="
	@echo "配置参数："
	@echo "  RATEL_SERVER_HOST=$(RATEL_SERVER_HOST)"
	@echo "  BACKEND_USE=$(BACKEND_USE)"
	@echo ""
	@echo "访问地址: http://localhost:8889"

# 生产环境命令
prod-build:
	docker build $(BUILD_ARGS) -t ratel-client:latest .

prod-up:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml up -d
	@echo "生产环境已启动："
	@echo "  游戏客户端: http://localhost"
	@echo "  健康检查: http://localhost/health"

prod-down:
	$(DOCKER_COMPOSE) -f docker-compose.prod.yml down

# 生产环境重新部署
prod-redeploy: prod-down prod-build prod-up
	@echo ""
	@echo "=== 生产环境重新部署完成 ==="
	@echo "配置参数："
	@echo "  RATEL_SERVER_HOST=$(RATEL_SERVER_HOST)"
	@echo "  BACKEND_USE=$(BACKEND_USE)"
	@echo ""
	@echo "访问地址: http://localhost"

# 测试命令
test:
	@echo "测试游戏客户端..."
	@curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8889 || echo "客户端端口未响应"
	@echo ""
	@echo "测试健康检查..."
	@curl -s http://localhost:8889/health || echo "健康检查未通过"
	@echo ""
	@echo "测试静态资源..."
	@curl -s -o /dev/null -w "JS文件状态码: %{http_code}\n" http://localhost:8889/js/init.js || echo "静态资源加载失败" 