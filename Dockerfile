# 使用 nginx 官方镜像作为基础镜像
FROM nginx:alpine

# 维护者信息
LABEL maintainer="js-ratel-client"
LABEL description="Ratel 在线斗地主游戏客户端"

# 构建参数
ARG RATEL_SERVER_HOST=ratel-be.youdomain.com
ARG RATEL_SERVER_PORT=80
ARG RATEL_SERVER_NAME=Nico
ARG RATEL_SERVER_VERSION=v1.3.0
ARG RATEL_IS_DEVELOPMENT=false
ARG BACKEND_USE=ws

# 环境变量配置
ENV RATEL_SERVER_HOST=${RATEL_SERVER_HOST}
ENV RATEL_SERVER_PORT=${RATEL_SERVER_PORT}
ENV RATEL_SERVER_NAME=${RATEL_SERVER_NAME}
ENV RATEL_SERVER_VERSION=${RATEL_SERVER_VERSION}
ENV RATEL_IS_DEVELOPMENT=${RATEL_IS_DEVELOPMENT}
ENV BACKEND_USE=${BACKEND_USE}

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 复制构建脚本并设置权限
COPY build.sh /usr/local/bin/build.sh
RUN chmod +x /usr/local/bin/build.sh

# 复制项目文件到 nginx 默认静态文件目录
COPY . .

# 强制复制正确的nginx配置文件到临时位置，然后移动到最终位置
# 这样可以确保不会被COPY . .覆盖
RUN rm -f /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# 验证nginx配置文件
RUN nginx -t && echo "nginx配置验证成功" || (echo "nginx配置验证失败" && cat /etc/nginx/nginx.conf && exit 1)

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

# 使用构建脚本启动，它会替换配置文件并启动 nginx
CMD ["/usr/local/bin/build.sh"] 