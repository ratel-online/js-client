# 使用 nginx 官方镜像作为基础镜像
FROM nginx:alpine

# 维护者信息
LABEL maintainer="js-ratel-client"
LABEL description="Ratel 在线斗地主游戏客户端"

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 复制项目文件到 nginx 默认静态文件目录
COPY . .

# 复制自定义 nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80

# 设置时区
RUN apk add --no-cache tzdata && \
  ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  echo "Asia/Shanghai" > /etc/timezone

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"] 