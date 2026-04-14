/**
 * 配置文件
 * 在构建时会被替换为实际的环境变量值
 */
window.RatelConfig = {
    // 服务器地址，格式：host:port:name[version]
    serverAddress: "game.isnico.com:9998:Nico[v50]",
    // WebSocket 地址，格式：ws://host:port/ws 或 wss://host:port/ws
    wsAddress: "ws://game.isnico.com:9998/ws",
    // 是否为开发环境
    isDevelopment: typeof __RATEL_IS_DEVELOPMENT__ !== 'undefined' ? __RATEL_IS_DEVELOPMENT__ : true
}; 