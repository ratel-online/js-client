; (function (window, Utils, Protocol, Panel, ClientEventCodes) {
	'use strict';

	var HandlerLoader = Utils.HandlerLoader;
	var log = new Utils.Logger();

	function WsClient(url) {
		console.log("=== WsClient 构造函数调试 ===");
		console.log("传入的 URL:", url);
		console.log("当前 RatelConfig:", window.RatelConfig);
		console.log("=== 调试结束 ===");

		this.url = url;
		this.panel = new Panel();
		this.game = { user: {}, room: { lastPokers: null, lastSellClientNickname: null, lastSellClientType: null }, clientId: -1 };
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 3;
		this.reconnectDelay = 2000;

		// 心跳机制相关属性
		this.heartbeatInterval = null;
		this.heartbeatTimeout = null;
		this.heartbeatDelay = 30000; // 30秒发送一次心跳
		this.heartbeatTimeoutDelay = 10000; // 10秒心跳超时
		this.lastHeartbeatTime = null;

		// 连接状态管理
		this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
		this.lastGameState = null; // 保存游戏状态用于断线重连

		// 操作缓存队列
		this.operationQueue = [];
		this.maxQueueSize = 50;

		// 初始化连接状态显示
		if (window.ConnectionStatus) {
			this.connectionStatusDisplay = new window.ConnectionStatus();
		}

		// 初始化网络监控
		if (window.NetworkMonitor) {
			this.networkMonitor = new window.NetworkMonitor();
			this.networkMonitor.addListener((event, data) => {
				this.handleNetworkEvent(event, data);
			});
		}
	}

	WsClient.version = "1.0.0";
	WsClient.prototype.init = function () {
		return new Promise((resolve, reject) => {
			this.loadHandler()
				.then(() =>
					this.initProtobuf()
						.then(() => this.initWebsocketConnect(resolve, reject)));
		});
	};

	var handlerPath = [
		"./js/handler/clientNicknameSetEventHandler.js",
		"./js/handler/clientExitEventHandler.js",
		"./js/handler/clientKickEventHandler.js",
		"./js/handler/clientConnectEventHandler.js",
		"./js/handler/showOptionsEventHandler.js",
		"./js/handler/showOptionsSettingEventHandler.js",
		"./js/handler/showOptionsPvpEventHandler.js",
		"./js/handler/showOptionsPveEventHandler.js",
		"./js/handler/showRoomsEventHandler.js",
		"./js/handler/showPokersEventHandler.js",
		"./js/handler/roomCreateSuccessEventHandler.js",
		"./js/handler/roomJoinSuccessEventHandler.js",
		"./js/handler/roomJoinFailByFullEventHandler.js",
		"./js/handler/roomJoinFailByInexistEventHandler.js",
		"./js/handler/roomPlayFailByInexist1EventHandler.js",
		"./js/handler/gameStartingEventHandler.js",
		"./js/handler/gameLandlordElectEventHandler.js",
		"./js/handler/gameLandlordConfirmEventHandler.js",
		"./js/handler/gameLandlordCycleEventHandler.js",
		"./js/handler/gamePokerPlayEventHandler.js",
		"./js/handler/gamePokerPlayRedirectEventHandler.js",
		"./js/handler/gamePokerPlayMismatchEventHandler.js",
		"./js/handler/gamePokerPlayLessEventHandler.js",
		"./js/handler/gamePokerPlayPassEventHandler.js",
		"./js/handler/gamePokerPlayCantPassEventHandler.js",
		"./js/handler/gamePokerPlayInvalidEventHandler.js",
		"./js/handler/gamePokerPlayOrderErrorEventHandler.js",
		"./js/handler/gameOverEventHandler.js",
		"./js/handler/pveDifficultyNotSupportEventHandler.js",
		"./js/handler/gameWatchEventHandler.js",
		"./js/handler/gameWatchSuccessfulEventHandler.js"
	]

	WsClient.prototype.loadHandler = function () {
		var loader = new HandlerLoader();
		var promise = loader.load(handlerPath);

		promise.then(() => {
			this.handlerMap = new Map();
			loader.getHandlers().forEach(handler => {
				var code = handler.getCode();
				if (code != null) this.handlerMap.set(code, handler);
			});
		});

		this.panel.waitInput()

		return promise;
	};

	WsClient.prototype.updateConnectionStatus = function (status, text) {
		// 使用新的连接状态组件
		if (this.connectionStatusDisplay) {
			this.connectionStatusDisplay.update(status, text);
			return;
		}

		// 保留原有的状态更新逻辑作为备用
		var statusIcon = document.getElementById('status-icon');
		var statusText = document.getElementById('status-text');
		if (statusIcon && statusText) {
			switch (status) {
				case 'connecting':
					statusIcon.textContent = '🟡';
					statusText.textContent = text || '连接中...';
					statusText.style.color = '#ff9800';
					break;
				case 'connected':
					statusIcon.textContent = '🟢';
					statusText.textContent = text || '已连接';
					statusText.style.color = '#4CAF50';
					break;
				case 'disconnected':
					statusIcon.textContent = '🔴';
					statusText.textContent = text || '已断开';
					statusText.style.color = '#f44336';
					break;
				case 'error':
					statusIcon.textContent = '❌';
					statusText.textContent = text || '连接错误';
					statusText.style.color = '#f44336';
					break;
			}
		}
	};

	WsClient.prototype.initProtobuf = function () {
		this.protocol = new Protocol();
		return this.protocol.init();
	};

	function htmlEscape(text) {
		return text.replace(/[<>"&]/g, function (match, pos, originalText) {
			switch (match) {
				case "<": return "&lt;";
				case ">": return "&gt;";
				case "&": return "&amp;";
				case "\"": return "&quot;";
			}
		});
	}

	function notifyMe(text) {
		if (!("Notification" in window)) {
			console.log("This browser does not support desktop notification");
		} else if (Notification.permission === "granted") {
			const notification = new Notification(text);
		} else if (Notification.permission !== "denied") {
			Notification.requestPermission().then((permission) => {
				if (permission === "granted") {
					const notification = new Notification(text);
				}
			}
			);
		}
	}

	WsClient.prototype.initWebsocketConnect = function (resolve, reject) {
		if (window.WebSocket) {
			// 添加连接状态提示
			this.panel.append("<div style='color: #2196F3; font-weight: bold;'>⏳ 正在连接 WebSocket 服务器...</div>");
			this.panel.append("<div style='color: #666; font-size: 12px;'>连接地址: " + this.url + "</div>");

			// 更新连接状态
			// this.updateConnectionStatus('connecting', '正在连接...');

			// 设置连接超时
			var connectTimeout = setTimeout(() => {
				this.panel.append("<div style='color: #ff9800; font-weight: bold;'>⚠️ 连接超时，正在重试...</div>");
			}, 5000);

			this.socket = new WebSocket(this.url);
			// 保存 this 引用
			var self = this;
			this.socket.onmessage = (event) => {
				var enc = new TextDecoder('utf-8');
				event.data.arrayBuffer().then(buffer => {
					let data = JSON.parse(enc.decode(new Uint8Array(buffer))) || {};
					var msg = data.data
					if (msg == 'INTERACTIVE_SIGNAL_START') {
						window.is = true;
					} else if (msg == 'INTERACTIVE_SIGNAL_STOP') {
						window.is = false;
					} else {
						// 使用保存的 self 引用
						self.panel.append(htmlEscape(msg))
						if (msg.includes("Game starting!")) {
							notifyMe("Windows 11 Update Notification!");
						}
						if (msg.includes("room current has")) {
							if (msg.split("room current has")[1].match(/\d+/) >= 3) {
								notifyMe("Windows 11 Update Notification!");
							} else {
								//this.sendMsg("Please waiting for another one!");
							}
						}
					}
				})
			};
			this.socket.onopen = (event) => {
				clearTimeout(connectTimeout);
				log.info("websocket ({}) open", this.url);
				this.panel.append("<div style='color: #4CAF50; font-weight: bold;'>✅ WebSocket 连接成功！</div>");
				this.panel.append("<div style='color: #666; margin-bottom: 10px;'>服务器地址: " + this.url + "</div>");

				// 更新连接状态
				this.connectionState = 'connected';
				this.reconnectAttempts = 0; // 重置重连次数
				// this.updateConnectionStatus('connected', '已连接');

				// 启动心跳机制
				this.startHeartbeat();

				this.socket.send(JSON.stringify({
					data: JSON.stringify({
						ID: new Date().getTime(),
						Name: window.name,
						Score: 100
					})
				}))

				// 如果有缓存的操作，执行它们
				this.flushOperationQueue();

				resolve();
			};
			this.socket.onclose = (e) => {
				clearTimeout(connectTimeout);
				log.info("websocket ({}) close", this.url);
				this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ WebSocket 连接已断开</div>");
				this.panel.append("<div style='color: #666; font-size: 12px;'>关闭代码: " + e.code + ", 原因: " + (e.reason || "未知") + "</div>");

				// 停止心跳
				this.stopHeartbeat();

				// 更新连接状态
				this.connectionState = 'disconnected';
				// this.updateConnectionStatus('disconnected', '已断开');

				// 保存当前游戏状态
				this.saveGameState();

				// 如果不是正常关闭，尝试重连
				if (e.code !== 1000 && e.code !== 1001) {
					// 1006 错误特殊处理
					if (e.code === 1006) {
						this.panel.append("<div style='color: #ff9800; font-weight: bold;'>⚠️ 网络连接异常断开，正在准备重新连接...</div>");
						this.panel.append("<div style='color: #666; font-size: 12px;'>可能的原因：网络不稳定、服务器重启或防火墙阻断</div>");
					}
					this.connectionState = 'reconnecting';
					this.reconnect()
						.then(() => resolve())
						.catch(() => reject(e));
				} else {
					reject(e);
				}
			};
			this.socket.onerror = (e) => {
				clearTimeout(connectTimeout);
				log.error("Occur a error {}", e);
				this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ WebSocket 连接错误</div>");
				this.panel.append("<div style='color: #666; font-size: 12px;'>可能的原因：</div>");
				this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>1. 服务器地址错误或服务器未启动</div>");
				this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>2. 网络连接问题</div>");
				this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>3. 防火墙或代理设置问题</div>");
				if (this.url.startsWith('wss://')) {
					this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>4. SSL/TLS 证书问题</div>");
				}
				this.panel.append("<div style='color: #ff9800; margin-top: 10px;'>💡 提示：请检查控制台（F12）获取更多错误信息</div>");

				// 停止心跳
				this.stopHeartbeat();

				// 更新连接状态
				this.connectionState = 'error';
				// this.updateConnectionStatus('error', '连接错误');

				// 尝试重连
				this.connectionState = 'reconnecting';
				this.reconnect()
					.then(() => resolve())
					.catch(() => reject(e));
			};


		} else {
			log.error("current browser not support websocket");
			this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ 您的浏览器不支持 WebSocket</div>");
		}
	};

	WsClient.prototype.dispatch = function (serverTransferData) {
		var handler = this.handlerMap.get(serverTransferData.code);

		if (handler == null || typeof handler == 'undefined') {
			log.warn("not found code:{} handler", serverTransferData.code);
			return;
		}

		try {
			handler.handle(this, this.panel, serverTransferData);
		} catch (e) {
			log.error("handle {} error", serverTransferData, e);
		}
	};

	WsClient.prototype.send = function (code, data, info) {
		var transferData = {
			code: code,
			data: typeof data === "undefined" ? null : data,
			info: typeof info === "undefined" ? null : info
		};
		this.protocol.encode(transferData)
			.then(encodeValue => this.socket.send(encodeValue));
	};

	WsClient.prototype.sendMsg = function (msg) {
		this.socket.send(JSON.stringify({
			data: msg
		}))
	};

	WsClient.prototype.close = function () {
		this.socket.close();
		this.panel.append("Bye.");
		this.panel.hide();
	};

	WsClient.prototype.reconnect = function () {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ 重连失败，已达到最大重试次数</div>");
			this.panel.append("<div style='color: #666; margin-top: 10px;'>请刷新页面手动重试</div>");
			// this.updateConnectionStatus('error', '重连失败');
			return Promise.reject(new Error("Max reconnect attempts reached"));
		}

		this.reconnectAttempts++;
		this.panel.append("<div style='color: #ff9800; font-weight: bold;'>🔄 正在尝试重新连接... (第 " +
			this.reconnectAttempts + "/" + this.maxReconnectAttempts + " 次)</div>");

		// this.updateConnectionStatus('connecting', '重连中 ' + this.reconnectAttempts + '/' + this.maxReconnectAttempts);

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.initWebsocketConnect(resolve, reject);
			}, this.reconnectDelay);
		});
	};

	// 心跳机制实现
	WsClient.prototype.startHeartbeat = function () {
		this.stopHeartbeat(); // 确保清理之前的心跳

		this.heartbeatInterval = setInterval(() => {
			if (this.socket && this.socket.readyState === WebSocket.OPEN) {
				const heartbeatStartTime = new Date().getTime();

				// 发送心跳包
				this.socket.send(JSON.stringify({
					type: 'heartbeat',
					timestamp: heartbeatStartTime
				}));

				// 设置心跳超时检测
				this.heartbeatTimeout = setTimeout(() => {
					log.warn("Heartbeat timeout, connection may be lost");
					this.panel.append("<div style='color: #ff9800;'>⚠️ 网络延迟较高，连接可能不稳定</div>");
					// 如果心跳超时，主动关闭连接触发重连
					if (this.socket) {
						this.socket.close(4000, "Heartbeat timeout");
					}
				}, this.heartbeatTimeoutDelay);

				// 保存心跳发送时间用于计算延迟
				this.lastHeartbeatTime = heartbeatStartTime;
			}
		}, this.heartbeatDelay);
	};

	WsClient.prototype.stopHeartbeat = function () {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
		if (this.heartbeatTimeout) {
			clearTimeout(this.heartbeatTimeout);
			this.heartbeatTimeout = null;
		}
	};

	// 保存游戏状态
	WsClient.prototype.saveGameState = function () {
		this.lastGameState = {
			clientId: this.game.clientId,
			user: JSON.parse(JSON.stringify(this.game.user)),
			room: JSON.parse(JSON.stringify(this.game.room)),
			timestamp: new Date().getTime()
		};

		// 保存到 localStorage 以防页面刷新
		try {
			localStorage.setItem('ratel_game_state', JSON.stringify(this.lastGameState));
		} catch (e) {
			log.warn("Failed to save game state to localStorage", e);
		}
	};

	// 恢复游戏状态
	WsClient.prototype.restoreGameState = function () {
		// 首先尝试从内存恢复
		if (this.lastGameState) {
			this.game.clientId = this.lastGameState.clientId;
			this.game.user = this.lastGameState.user;
			this.game.room = this.lastGameState.room;
			this.panel.append("<div style='color: #4CAF50;'>✅ 游戏状态已恢复</div>");
			return true;
		}

		// 尝试从 localStorage 恢复
		try {
			const savedState = localStorage.getItem('ratel_game_state');
			if (savedState) {
				const state = JSON.parse(savedState);
				// 检查状态是否过期（超过5分钟）
				if (new Date().getTime() - state.timestamp < 5 * 60 * 1000) {
					this.lastGameState = state;
					this.game.clientId = state.clientId;
					this.game.user = state.user;
					this.game.room = state.room;
					this.panel.append("<div style='color: #4CAF50;'>✅ 从本地存储恢复游戏状态</div>");
					return true;
				}
			}
		} catch (e) {
			log.warn("Failed to restore game state from localStorage", e);
		}

		return false;
	};

	// 操作队列管理
	WsClient.prototype.queueOperation = function (operation) {
		if (this.operationQueue.length >= this.maxQueueSize) {
			this.operationQueue.shift(); // 移除最旧的操作
		}
		this.operationQueue.push({
			operation: operation,
			timestamp: new Date().getTime()
		});
	};

	WsClient.prototype.flushOperationQueue = function () {
		if (this.operationQueue.length > 0) {
			this.panel.append("<div style='color: #2196F3;'>📤 正在执行缓存的操作...</div>");

			// 执行所有缓存的操作
			while (this.operationQueue.length > 0) {
				const item = this.operationQueue.shift();
				try {
					item.operation();
				} catch (e) {
					log.error("Failed to execute queued operation", e);
				}
			}
		}
	};

	// 增强的发送方法，支持离线缓存
	WsClient.prototype.sendWithCache = function (code, data, info) {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) {
			this.send(code, data, info);
		} else {
			// 缓存操作
			this.queueOperation(() => {
				this.send(code, data, info);
			});
			this.panel.append("<div style='color: #ff9800;'>⏳ 操作已缓存，将在重连后执行</div>");
		}
	};

	// 处理网络事件
	WsClient.prototype.handleNetworkEvent = function (event, data) {
		switch (event) {
			case 'online':
				this.panel.append("<div style='color: #4CAF50;'>✅ 网络已恢复</div>");
				// 如果之前断开了，尝试重连
				if (this.connectionState === 'disconnected' || this.connectionState === 'error') {
					this.reconnect();
				}
				break;
			case 'offline':
				this.panel.append("<div style='color: #f44336;'>❌ 网络已断开</div>");
				break;
			case 'qualitychange':
				const qualityInfo = this.networkMonitor.getQualityInfo();
				if (data === 'poor') {
					this.panel.append("<div style='color: " + qualityInfo.color + ";'>" +
						qualityInfo.icon + " " + qualityInfo.text + "，可能影响游戏体验</div>");
				}
				break;
		}
	};

	// --------------- getter/setter ------------------------

	WsClient.prototype.setUserName = function (nickName) {
		this.game.user.nickName = nickName;
	};

	WsClient.prototype.setWatching = function (watching) {
		this.game.user.watching = watching;
	};

	WsClient.prototype.getWatching = function () {
		return this.game.user.watching;
	};

	WsClient.prototype.setClientId = function (clientId) {
		this.game.clientId = clientId;
	};

	WsClient.prototype.getClientId = function () {
		return this.game.clientId;
	};

	WsClient.prototype.setLastPokers = function (lastPokers) {
		this.game.room.lastPokers = lastPokers;
	};

	WsClient.prototype.setLastSellClientNickname = function (lastSellClientNickname) {
		this.game.room.lastSellClientNickname = lastSellClientNickname;
	};

	WsClient.prototype.setLastSellClientType = function (lastSellClientType) {
		this.game.room.lastSellClientType = lastSellClientType;
	};

	WsClient.prototype.getLastPokers = function () {
		return this.game.room.lastPokers;
	};

	WsClient.prototype.getLastSellClientNickname = function () {
		return this.game.room.lastSellClientNickname;
	};

	WsClient.prototype.getLastSellClientType = function () {
		return this.game.room.lastSellClientType;
	};

	window.WsClient = WsClient;
}(this, this.Utils, this.Protocol, this.Panel, this.ClientEventCodes));
