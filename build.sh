#!/bin/sh

# 设置默认值
DEFAULT_SERVER_HOST="ratel-be.youdomain.com"
DEFAULT_SERVER_PORT="80"
DEFAULT_SERVER_NAME="Nico"
DEFAULT_SERVER_VERSION="v1.3.0"
DEFAULT_BACKEND_USE="ws"

# 从环境变量获取配置或使用默认值
RATEL_SERVER_HOST=${RATEL_SERVER_HOST:-$DEFAULT_SERVER_HOST}
RATEL_SERVER_PORT=${RATEL_SERVER_PORT:-$DEFAULT_SERVER_PORT}
RATEL_SERVER_NAME=${RATEL_SERVER_NAME:-$DEFAULT_SERVER_NAME}
RATEL_SERVER_VERSION=${RATEL_SERVER_VERSION:-$DEFAULT_SERVER_VERSION}
BACKEND_USE=${BACKEND_USE:-$DEFAULT_BACKEND_USE}

# 构建服务器地址
SERVER_ADDRESS="${RATEL_SERVER_HOST}:${RATEL_SERVER_PORT}:${RATEL_SERVER_NAME}[${RATEL_SERVER_VERSION}]"

# 构建 WebSocket 地址
# 根据 BACKEND_USE 决定使用 ws 还是 wss
if [ "$BACKEND_USE" = "wss" ]; then
    WS_PROTOCOL="wss"
else
    WS_PROTOCOL="ws"
fi

# 对于默认端口，不需要显式指定
# ws 默认端口是 80，wss 默认端口是 443
if [ "$RATEL_SERVER_PORT" = "80" ] && [ "$WS_PROTOCOL" = "ws" ]; then
    WS_ADDRESS="${WS_PROTOCOL}://${RATEL_SERVER_HOST}/ws"
elif [ "$RATEL_SERVER_PORT" = "443" ] && [ "$WS_PROTOCOL" = "wss" ]; then
    WS_ADDRESS="${WS_PROTOCOL}://${RATEL_SERVER_HOST}/ws"
elif [ "$RATEL_SERVER_PORT" = "80" ] && [ "$WS_PROTOCOL" = "wss" ]; then
    # 特殊情况：wss 但后端监听 80 端口（通过 Cloudflare）
    WS_ADDRESS="${WS_PROTOCOL}://${RATEL_SERVER_HOST}/ws"
else
    WS_ADDRESS="${WS_PROTOCOL}://${RATEL_SERVER_HOST}:${RATEL_SERVER_PORT}/ws"
fi

# 是否为开发环境
IS_DEVELOPMENT=${RATEL_IS_DEVELOPMENT:-false}

echo "正在配置 Ratel 客户端..."
echo "服务器地址: $SERVER_ADDRESS"
echo "WebSocket 地址: $WS_ADDRESS"
echo "WebSocket 协议: $WS_PROTOCOL"
echo "开发环境: $IS_DEVELOPMENT"

# 检查nginx配置文件
echo "检查nginx配置文件..."
nginx -t
if [ $? -ne 0 ]; then
    echo "nginx配置文件有错误，查看第45行周围内容："
    sed -n '40,50p' /etc/nginx/nginx.conf
    exit 1
fi

# 检查配置文件是否存在并且可以修改
if [ -f /usr/share/nginx/html/js/config.js ]; then
    # 创建临时文件并替换内容
    cp /usr/share/nginx/html/js/config.js /tmp/config.js
    sed "s|__RATEL_SERVER_ADDRESS__|$SERVER_ADDRESS|g" /tmp/config.js > /tmp/config_temp.js
    sed "s|__RATEL_WS_ADDRESS__|$WS_ADDRESS|g" /tmp/config_temp.js > /tmp/config_temp2.js
    sed "s|__RATEL_IS_DEVELOPMENT__|$IS_DEVELOPMENT|g" /tmp/config_temp2.js > /usr/share/nginx/html/js/config.js
    rm -f /tmp/config.js /tmp/config_temp.js /tmp/config_temp2.js
    echo "配置文件已更新"
else
    echo "配置文件不存在，创建新的配置文件"
    cat > /usr/share/nginx/html/js/config.js << EOF
/**
 * 配置文件
 * 在构建时会被替换为实际的环境变量值
 */
window.RatelConfig = {
    // 服务器地址，格式：host:port:name[version]
    serverAddress: "$SERVER_ADDRESS",
    // WebSocket 地址，格式：ws://host:port/ws
    wsAddress: "$WS_ADDRESS",
    // 是否为开发环境
    isDevelopment: $IS_DEVELOPMENT
};
EOF
fi

echo "配置完成！"

# 启动 nginx
exec nginx -g "daemon off;" 