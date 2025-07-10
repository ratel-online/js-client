; (function (window, Utils) {
    'use strict';

    var existingServerListApis = [
        "https://raw.githubusercontent.com/ainilili/ratel/master/serverlist.json",
    ];
    var existingServerList = [
        window.RatelConfig ? window.RatelConfig.serverAddress : "ratel-be.youdomain.com:80:Nico[v1.3.0]"
    ];

    function Server(s) {
        if (!Server.pattern.test(s)) {
            throw new Error("Illegal server address. Server address schema like: ip:port:name[version].");
        }
        var arr = Server.pattern.exec(s);
        this.host = arr[1];
        this.port = parseInt(arr[2]);
        if (arr[3]) this.name = arr[3];
        if (arr[4]) this.version = parseInt(arr[4].replace(/\./g, ""));
    }

    Server.pattern = /([\w\.\-]+):(\d+)(?::(\w+)\[v(1\.\d\.\d)\])?/i;
    Server.requiredMinVersion = "v1.2.7";

    Server.prototype.compareVersion = function (otherVersion) {
        if (otherVersion.startsWith("v") || otherVersion.startsWith("V")) {
            otherVersion = otherVersion.substr(1);
        }

        return this.version - parseInt(otherVersion.replace(/\./g, ""));
    };

    Server.prototype.toString = function () {
        var s = this.host + ":" + this.port;
        if (this.name) s += ":" + this.name;
        if (this.version) s += "[v" + this.version + "]";
        return s;
    };

    // ---------------------------------------------------------------------------------------------
    var defaultLoadTimeout = 1000;

    function showInput() {
        var contentDiv = document.querySelector("#content");
        contentDiv.innerHTML += "Nickname: ";
        var input = document.querySelector("#input");
        input.addEventListener("keypress", selectServer, false);
        input.focus();
    }

    function selectServer(e) {
        if (e.keyCode != 13) {
            return;
        }

        var contentEl = document.querySelector("#content");
        var contentDiv = document.querySelector("#content");
        var input = document.querySelector("#input");
        input.value = input.value.trim()
        if (!input.value) {
            contentEl.innerHTML += "</br><font color='red'>Nickname不能为空</font></br>";
            return showInput()
        }
        if (input.value.length > 10) {
            contentEl.innerHTML += "</br><font color='red'>Nickname不能超出10个字符</font></br>";
            return showInput()
        }
        var s = window.RatelConfig ? window.RatelConfig.serverAddress : "ratel-be.youdomain.com:80:Nico[v1.0.0]"
        var server = new Server(s);
        window.name = input.value;
        input.value = "";

        contentDiv.innerHTML += name + " </br>";
        start(server.host, server.port)
            .then(() => input.removeEventListener("keypress", selectServer, false))
            .catch(e => {
                console.error(e);
                contentEl.innerHTML += "<div style='background-color: #ffebee; border: 1px solid #ffcdd2; " +
                    "border-radius: 4px; padding: 10px; margin: 10px 0;'>" +
                    "<div style='color: #d32f2f; font-weight: bold;'>❌ 连接服务器失败</div>" +
                    "<div style='color: #666; font-size: 12px; margin-top: 5px;'>服务器: " + server.toString() + "</div>" +
                    "<div style='color: #666; font-size: 12px;'>错误类型: " + (e.type || "未知") + "</div>" +
                    "<div style='color: #666; font-size: 12px; margin-top: 10px;'>请尝试以下操作：</div>" +
                    "<div style='color: #666; font-size: 12px; margin-left: 20px;'>• 刷新页面重试</div>" +
                    "<div style='color: #666; font-size: 12px; margin-left: 20px;'>• 检查网络连接</div>" +
                    "<div style='color: #666; font-size: 12px; margin-left: 20px;'>• 联系管理员确认服务器状态</div>" +
                    "</div>";
                // 重新显示输入框，让用户可以重试
                showInput();
            });
    }

    function start(host, port) {
        if (typeof host === "undefined") {
            host = "127.0.0.1";
        }
        if (typeof port === "undefined") {
            port = 1025;
        }

        // 调试信息
        console.log("=== WebSocket 配置调试信息 ===");
        console.log("host:", host);
        console.log("port:", port);
        console.log("RatelConfig:", window.RatelConfig);
        console.log("wsAddress from config:", window.RatelConfig ? window.RatelConfig.wsAddress : "undefined");

        // 添加更详细的调试
        console.log("window.RatelConfig 存在吗?", !!window.RatelConfig);
        console.log("window.RatelConfig.wsAddress 存在吗?", !!(window.RatelConfig && window.RatelConfig.wsAddress));
        console.log("window.RatelConfig 的完整内容:", JSON.stringify(window.RatelConfig, null, 2));

        // 优先使用配置文件中的 WebSocket 地址（由构建脚本生成）
        var wsUrl;
        if (window.RatelConfig && window.RatelConfig.wsAddress) {
            wsUrl = window.RatelConfig.wsAddress;
            console.log("使用配置的 wsAddress:", wsUrl);
        } else {
            // 回退到默认构建逻辑（仅在没有配置时使用）
            console.log("没有找到配置的 wsAddress，使用默认构建逻辑");

            // 检测当前页面协议，决定使用 ws 还是 wss
            var protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

            // 对于域名和标准端口，不需要显式指定端口号
            if ((port === 80 && protocol === 'ws') || (port === 443 && protocol === 'wss')) {
                wsUrl = protocol + "://" + host + "/ws";
            } else {
                wsUrl = protocol + "://" + host + ":" + port + "/ws";
            }
            console.log("构建的 wsUrl:", wsUrl);
        }

        console.log("最终使用的 wsUrl:", wsUrl);
        console.log("=== 调试信息结束 ===");

        window.wsClient = new WsClient(wsUrl);
        window.wsClient.panel.help()

        // 显示连接信息，明确标注协议类型
        var isSecure = wsUrl.startsWith('wss://');
        var protocol = isSecure ? 'WSS (安全加密)' : 'WS (非加密)';
        var protocolColor = isSecure ? '#28a745' : '#ffc107';
        var protocolIcon = isSecure ? '🔒' : '⚠️';
        var protocolBg = isSecure ? '#d4edda' : '#fff3cd';
        var protocolBorder = isSecure ? '#c3e6cb' : '#ffeeba';

        document.querySelector("#content").innerHTML +=
            "<div style='margin: 10px 0; padding: 8px 12px; background-color: " + protocolBg +
            "; border: 1px solid " + protocolBorder + "; border-radius: 4px;'>" +
            protocolIcon + " Connect to <span style='color: " + protocolColor + "; font-weight: bold;'>" +
            wsUrl + "</span>" +
            " <span style='background-color: " + protocolColor + "; color: white; padding: 2px 6px; " +
            "border-radius: 3px; font-size: 12px; margin-left: 8px;'>" + protocol + "</span>" +
            "</div>";

        var client = window.wsClient.init();
        return client;
    }

    window.onload = function () {
        defaultSite.render();
        showInput();

        // 更新页面标题显示协议
        var wsAddress = window.RatelConfig && window.RatelConfig.wsAddress;
        if (wsAddress) {
            var protocolType = wsAddress.startsWith('wss://') ? '[🔒 WSS]' : '[⚠️ WS]';
            document.title = 'Ratel Online ' + protocolType;

            // 更新页面顶部标题
            var headTitle = document.getElementById('headTitle');
            if (headTitle) {
                headTitle.textContent = 'Ratel Online ' + protocolType;
            }
        } else {
            // 回退到页面协议检测
            var protocolType = window.location.protocol === 'https:' ? '[🔒 WSS]' : '[⚠️ WS]';
            document.title = 'Ratel Online ' + protocolType;

            var headTitle = document.getElementById('headTitle');
            if (headTitle) {
                headTitle.textContent = 'Ratel Online ' + protocolType;
            }
        }
    };

    document.onkeydown = function (event) {
        var e = event || window.event;
        if (e && e.keyCode == 13) {
            document.getElementById("input").focus()
        }
    };
}(this, this.Utils));