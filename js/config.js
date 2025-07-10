/**
 * 配置文件
 * 在构建时会被替换为实际的环境变量值
 */
window.RatelConfig = {
    // 服务器地址，格式：host:port:name[version]
    serverAddress: "__RATEL_SERVER_ADDRESS__",
    // WebSocket 地址，格式：ws://host:port/ws 或 wss://host:port/ws
    wsAddress: "__RATEL_WS_ADDRESS__",
    // 是否为开发环境
    isDevelopment: __RATEL_IS_DEVELOPMENT__
}; 