// Modern Terminal JavaScript
(function () {
  'use strict';



  // Terminal state
  let terminalState = {
    connected: false,
    nickname: null,
    currentRoom: null,
    wsClient: null,
    commandHistory: [],
    historyIndex: -1,
    availableRooms: [] // 存储可用房间列表
  };

  // DOM elements - 将在 init 函数中初始化
  let elements = {};

  // Available commands
  const commands = {
    help: {
      description: 'Show available commands',
      execute: showHelp
    },
    clear: {
      description: 'Clear terminal output',
      execute: clearTerminal
    },
    join: {
      description: 'Join a room (usage: join or 1)',
      execute: joinRoom
    },
    new: {
      description: 'Create a new room (usage: new or 2)',
      execute: createRoom
    },
    rooms: {
      description: 'Show available rooms',
      execute: showRooms
    },
    exit: {
      description: 'Exit current room or disconnect',
      execute: exitCommand
    },
    status: {
      description: 'Show connection status',
      execute: showStatus
    }
  };

  // Initialize terminal
  function init() {
    // 初始化 DOM 元素
    elements = {
      output: document.getElementById('terminal-output'),
      nicknameInput: document.getElementById('nickname-input'),
      nicknameContainer: document.getElementById('nickname-input-container'),
      commandInput: document.getElementById('command-input'),
      commandContainer: document.getElementById('command-input-container'),
      userPrompt: document.getElementById('user-prompt'),
      connectionStatus: document.getElementById('connection-status'),
      roomModal: document.getElementById('room-modal'),
      roomList: document.getElementById('room-list'),
      gameTypeModal: document.getElementById('game-type-modal')
    };

    // 确保所有元素都存在
    if (!elements.nicknameInput || !elements.commandInput) {
      console.error('Required DOM elements not found');
      return;
    }

    // Focus on nickname input
    elements.nicknameInput.focus();

    // Event listeners
    elements.nicknameInput.addEventListener('keypress', handleNicknameInput);
    elements.commandInput.addEventListener('keypress', handleCommandInput);
    elements.commandInput.addEventListener('keydown', handleCommandNavigation);

    // Add terminal control event listeners
    const closeBtn = document.querySelector('.control.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit?')) {
          window.location.href = 'index.html';
        }
      });
    }

    const minimizeBtn = document.querySelector('.control.minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const container = document.querySelector('.terminal-container');
        if (container) {
          container.style.transform = 'scale(0.9)';
          setTimeout(() => {
            container.style.transform = 'scale(1)';
          }, 300);
        }
      });
    }

    const maximizeBtn = document.querySelector('.control.maximize');
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        const container = document.querySelector('.terminal-container');
        if (container) {
          container.classList.toggle('fullscreen');
        }
      });
    }

    // Add initial output
    addOutput('Welcome to Ratel Online Terminal v2.0', 'success');
    addOutput('Please enter your nickname to continue...', 'info');
  }

  // Handle nickname input
  function handleNicknameInput(e) {
    if (e.key === 'Enter') {
      const nickname = elements.nicknameInput.value.trim();
      if (nickname) {
        terminalState.nickname = nickname;
        connectWebSocket(nickname);
      } else {
        addOutput('Error: Nickname cannot be empty', 'error');
      }
    }
  }

  // Handle command input
  function handleCommandInput(e) {
    if (e.key === 'Enter') {
      const command = elements.commandInput.value.trim();
      if (command) {
        // Add to history
        terminalState.commandHistory.push(command);
        terminalState.historyIndex = terminalState.commandHistory.length;

        // Show command in output
        addOutput(`${terminalState.nickname}@ratel:~$ ${command}`, 'prompt');

        // Process command
        processCommand(command);

        // Clear input
        elements.commandInput.value = '';
      }
    }
  }

  // Handle command navigation (up/down arrows for history)
  function handleCommandNavigation(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalState.historyIndex > 0) {
        terminalState.historyIndex--;
        elements.commandInput.value = terminalState.commandHistory[terminalState.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (terminalState.historyIndex < terminalState.commandHistory.length - 1) {
        terminalState.historyIndex++;
        elements.commandInput.value = terminalState.commandHistory[terminalState.historyIndex];
      } else {
        terminalState.historyIndex = terminalState.commandHistory.length;
        elements.commandInput.value = '';
      }
    }
  }

  // Process command
  function processCommand(input) {
    const parts = input.toLowerCase().split(' ');
    const command = parts[0];

    // Check for numeric shortcuts
    if (command === '1') {
      joinRoom();
      return;
    } else if (command === '2') {
      createRoom();
      return;
    } else if (command === '5') {
      // Auto join Texas Hold'em
      selectGameType('poker');
      return;
    }

    // Check for game commands (poker actions)
    const gameCommands = ['call', 'raise', 'fold', 'check', 'allin'];
    if (gameCommands.includes(command)) {
      // Send game command directly to server
      terminalState.wsClient.sendMsg(input);
      return;
    }

    // Check for terminal commands
    if (commands[command]) {
      commands[command].execute(parts.slice(1));
    } else {
      // For any other command, send it to the server
      terminalState.wsClient.sendMsg(input);
    }
  }

  // Connect WebSocket
  function connectWebSocket(nickname) {
    addOutput(`Connecting as ${nickname}...`, 'info');
    updateConnectionStatus('connecting', 'Connecting...');

    // 重要：在创建 WebSocket 连接之前设置 window.name
    window.name = nickname;

    // Hide nickname input, show command input
    elements.nicknameContainer.style.display = 'none';
    elements.commandContainer.style.display = 'flex';
    elements.userPrompt.textContent = `${nickname}@ratel:~$ `;
    elements.commandInput.focus();

    // Get WebSocket URL from config
    let wsUrl;
    if (window.RatelConfig && window.RatelConfig.wsAddress && window.RatelConfig.wsAddress !== "__RATEL_WS_ADDRESS__") {
      wsUrl = window.RatelConfig.wsAddress;
    } else {
      // 使用默认的 WebSocket 地址
      wsUrl = 'wss://ratel-be.cheverjohn.me/ws';
    }

    console.log('WebSocket URL:', wsUrl);

    // 确保 WsClient 已加载
    if (typeof window.WsClient === 'undefined') {
      addOutput('Error: WebSocket client library not loaded!', 'error');
      addOutput('Please check if all required scripts are loaded.', 'error');
      throw new Error('WsClient is not defined');
    }

    // 临时替换 Panel 为 ModernPanel
    const OriginalPanel = window.Panel;
    if (window.ModernPanel) {
      window.Panel = window.ModernPanel;
      console.log('Using ModernPanel instead of Panel for modern-terminal');
    }



    // Create WebSocket client
    // Create WebSocket client
    try {
      terminalState.wsClient = new window.WsClient(wsUrl);

      // 设置全局引用以保持向后兼容性
      window.wsClient = terminalState.wsClient;

      // 检查 panel 是否正确初始化
      if (!terminalState.wsClient.panel) {
        throw new Error('Panel initialization failed');
      }
    } catch (error) {
      addOutput('Error creating WebSocket client: ' + error.message, 'error');
      addOutput('This might be due to missing dependencies or DOM elements.', 'error');

      // 允许用户重试
      elements.nicknameContainer.style.display = 'flex';
      elements.commandContainer.style.display = 'none';
      elements.nicknameInput.value = nickname;
      elements.nicknameInput.focus();
      return;
    }

    // Override panel methods to integrate with terminal
    terminalState.wsClient.panel.append = function (message) {
      // Parse and display message in terminal
      if (typeof message === 'string') {
        // Remove HTML tags for terminal display
        let cleanMessage = message.replace(/<[^>]*>/g, '');

        // 解码 HTML 实体
        cleanMessage = cleanMessage.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

        // Skip empty messages
        if (cleanMessage.trim()) {
          // 检查消息中是否包含房间列表信息
          const roomDataPattern = /(\d+)\s+([\u4e00-\u9fa5\w-]+)\s+(\d+)\s+(Waiting|Running|Full)/g;
          const roomMatches = [...cleanMessage.matchAll(roomDataPattern)];

          if (roomMatches.length > 0) {
            // 如果找到房间数据，解析它们
            roomMatches.forEach(match => {
              const roomData = {
                roomId: parseInt(match[1]),
                roomType: match[2],
                roomClientCount: parseInt(match[3]),
                status: match[4]
              };

              // 避免重复添加相同的房间
              const exists = terminalState.availableRooms.some(r => r.roomId === roomData.roomId);
              if (!exists) {
                terminalState.availableRooms.push(roomData);
                console.log('Parsed room:', roomData);
              }
            });

            // 如果正在等待显示房间模态框，延迟一点显示
            if (terminalState.waitingForRoomModal && terminalState.availableRooms.length > 0) {
              setTimeout(() => {
                if (terminalState.waitingForRoomModal) {
                  terminalState.waitingForRoomModal = false;
                  clearTimeout(terminalState.roomModalTimeout);
                  showRoomModal();
                }
              }, 300);
            }
          } else if (cleanMessage.includes('Room invalid') && terminalState.waitingForRoomModal) {
            // 如果收到 "Room invalid" 且没有房间数据，可能表示没有可用房间
            setTimeout(() => {
              if (terminalState.waitingForRoomModal && terminalState.availableRooms.length === 0) {
                terminalState.waitingForRoomModal = false;
                clearTimeout(terminalState.roomModalTimeout);
                showRoomModal();
              }
            }, 500);
          }

          // 格式化游戏消息
          cleanMessage = formatGameMessage(cleanMessage);

          // 分行输出，每行可能有不同的样式
          const lines = cleanMessage.split('\n');
          lines.forEach(line => {
            if (!line.trim()) return;

            // 根据行内容决定样式
            let messageType = 'info';

            // 游戏状态
            if (line.includes('Game starting!')) {
              messageType = 'success';
            }
            // 手牌信息
            else if (line.includes('Your hand:')) {
              messageType = 'warning';
              // 高亮显示手牌
              line = line.replace(/([♠♥♦♣]\w+)/g, '[$1]');
            }
            // 公共牌
            else if (line.includes('Board:')) {
              messageType = 'info';
              line = line.replace(/([♠♥♦♣]\w+)/g, '[$1]');
            }
            // 获胜信息
            else if (line.includes('Winner:')) {
              messageType = 'success';
            }
            // 行动提示
            else if (line.includes('What do you want to do?')) {
              messageType = 'prompt';
            }
            // 玩家行动
            else if (line.startsWith('>>')) {
              messageType = 'game-action';
            }
            // 金额信息
            else if (line.includes('amount')) {
              messageType = 'game-info';
            }
            // 回合信息
            else if (line.includes('round')) {
              messageType = 'warning';
            }
            // 盲注信息
            else if (line.includes('blind')) {
              messageType = 'game-info';
            }

            addSingleLine(line, messageType);
          });

          // 确保滚动到底部
          autoScrollToBottom();
        }
      }
    };

    terminalState.wsClient.panel.waitInput = function () {
      // Terminal is always ready for input
      return Promise.resolve();
    };

    terminalState.wsClient.panel.hide = function () {
      // No-op for terminal
    };

    terminalState.wsClient.panel.help = function () {
      // No-op for terminal, we have our own help
    };

    // 保存原始的 dispatch 方法
    const originalDispatch = terminalState.wsClient.dispatch;
    terminalState.wsClient.dispatch = function (serverTransferData) {
      // 拦截房间列表数据
      if (serverTransferData.code === window.ClientEventCodes.CODE_SHOW_ROOMS) {
        try {
          const rooms = JSON.parse(serverTransferData.data);
          terminalState.availableRooms = rooms;
          console.log('Received rooms:', rooms);
        } catch (e) {
          console.error('Failed to parse room data:', e);
        }
      }
      // 调用原始的 dispatch 方法
      originalDispatch.call(this, serverTransferData);
    };

    // Initialize WebSocket connection
    terminalState.wsClient.init().then(() => {
      terminalState.connected = true;
      updateConnectionStatus('connected', 'Connected');
      addOutput('Successfully connected to server!', 'success');
      addOutput('Type "help" to see available commands or:', 'info');
      addOutput('  1. Join - Join an existing room', 'info');
      addOutput('  2. New  - Create a new room', 'info');

      // Set nickname - window.name 已经在连接前设置
      terminalState.wsClient.setUserName(nickname);

      // 如果有 imClient，也设置昵称
      if (window.imClient && window.imClient.setNickname) {
        window.imClient.setNickname(nickname);
      }

      // 恢复原始 Panel 类
      if (OriginalPanel) {
        window.Panel = OriginalPanel;
      }
    }).catch((error) => {
      terminalState.connected = false;
      updateConnectionStatus('disconnected', 'Disconnected');
      addOutput('Failed to connect to server!', 'error');
      addOutput('Error: ' + error.message, 'error');

      // Allow retry
      elements.nicknameContainer.style.display = 'flex';
      elements.commandContainer.style.display = 'none';
      elements.nicknameInput.value = nickname;
      elements.nicknameInput.focus();

      // 恢复原始 Panel 类
      if (OriginalPanel) {
        window.Panel = OriginalPanel;
      }
    });
  }

  // Command functions
  function showHelp() {
    addOutput('Available commands:', 'info');
    for (const [cmd, info] of Object.entries(commands)) {
      addOutput(`  ${cmd.padEnd(10)} - ${info.description}`, 'info');
    }
    addOutput('\nShortcuts:', 'info');
    addOutput('  1          - Join a room', 'info');
    addOutput('  2          - Create a new room', 'info');
    addOutput('  5          - Auto join Texas Hold\'em room', 'info');
  }

  function clearTerminal() {
    const welcomeMessage = elements.output.querySelector('.welcome-message');
    elements.output.innerHTML = '';
    if (welcomeMessage) {
      elements.output.appendChild(welcomeMessage);
    }
  }

  function joinRoom() {
    if (!terminalState.connected) {
      addOutput('Error: Not connected to server', 'error');
      return;
    }

    // 发送 "1" 命令来获取房间列表
    addOutput('Fetching available rooms...', 'info');
    terminalState.availableRooms = []; // 清空之前的房间列表
    terminalState.waitingForRoomModal = true; // 标记正在等待房间数据
    terminalState.wsClient.sendMsg("1"); // 使用 sendMsg 发送原始消息

    // 设置超时，以防服务器没有返回数据
    terminalState.roomModalTimeout = setTimeout(() => {
      if (terminalState.waitingForRoomModal) {
        terminalState.waitingForRoomModal = false;
        showRoomModal();
      }
    }, 2000);
  }

  function createRoom() {
    if (!terminalState.connected) {
      addOutput('Error: Not connected to server', 'error');
      return;
    }

    addOutput('Creating new room...', 'info');
    showGameTypeModal();
  }

  function showRooms() {
    if (!terminalState.connected) {
      addOutput('Error: Not connected to server', 'error');
      return;
    }

    addOutput('Fetching room list...', 'info');
    terminalState.wsClient.send(window.ClientEventCodes.CODE_SHOW_ROOMS);
  }

  function exitCommand() {
    if (terminalState.currentRoom) {
      addOutput('Exiting current room...', 'info');
      // Send exit room command
      terminalState.wsClient.send(window.ClientEventCodes.CODE_CLIENT_EXIT);
      terminalState.currentRoom = null;
    } else if (terminalState.connected) {
      addOutput('Disconnecting from server...', 'info');
      terminalState.wsClient.close();
      terminalState.connected = false;
      updateConnectionStatus('disconnected', 'Disconnected');

      // Show nickname input again
      elements.nicknameContainer.style.display = 'flex';
      elements.commandContainer.style.display = 'none';
      elements.nicknameInput.value = '';
      elements.nicknameInput.focus();
    } else {
      addOutput('Not connected to any server', 'warning');
    }
  }

  function showStatus() {
    addOutput('=== Connection Status ===', 'info');
    addOutput(`Connected: ${terminalState.connected ? 'Yes' : 'No'}`, terminalState.connected ? 'success' : 'error');
    addOutput(`Nickname: ${terminalState.nickname || 'Not set'}`, 'info');
    addOutput(`Current Room: ${terminalState.currentRoom || 'None'}`, 'info');
    addOutput('========================', 'info');
  }

  // Modal functions
  function showRoomModal() {
    // 使用真实的房间数据
    if (terminalState.availableRooms && terminalState.availableRooms.length > 0) {
      let roomsHtml = '';
      terminalState.availableRooms.forEach(room => {
        // roomType 已经是中文了，如 "德州扑克"
        const gameType = room.roomType;
        const status = room.status;
        const isRunning = status === 'Running';
        const isJoinable = !isRunning && room.roomClientCount < 3;

        // 根据状态设置不同的样式和行为
        const roomClass = isRunning ? 'room-item room-running' :
          !isJoinable ? 'room-item room-full' :
            'room-item';
        const onclick = isJoinable ? `onclick="selectRoom('Room #${room.roomId}', ${room.roomId})"` : '';
        const statusText = isRunning ? 'Running (Cannot Join)' :
          room.roomClientCount >= 3 ? 'Full' :
            'Waiting';

        roomsHtml += `
          <div class="${roomClass}" ${onclick} ${!isJoinable ? 'style="cursor: not-allowed; opacity: 0.6;"' : ''}>
            <div class="room-name">Room #${room.roomId}</div>
            <div class="room-info">ID: ${room.roomId} | ${gameType} | Players: ${room.roomClientCount}/3 | Status: ${statusText}</div>
          </div>
        `;
      });
      elements.roomList.innerHTML = roomsHtml;
    } else {
      elements.roomList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <p>No rooms available</p>
          <p style="margin-top: 10px; font-size: 14px;">Create a new room or refresh the list</p>
        </div>
      `;
    }
    elements.roomModal.style.display = 'flex';
  }

  function showGameTypeModal() {
    elements.gameTypeModal.style.display = 'flex';
  }

  // Global functions for modal interactions
  window.closeRoomModal = function () {
    elements.roomModal.style.display = 'none';
  };

  window.closeGameTypeModal = function () {
    elements.gameTypeModal.style.display = 'none';
  };

  window.selectRoom = function (roomName, roomId) {
    addOutput(`Joining ${roomName} (ID: ${roomId})...`, 'info');
    terminalState.currentRoom = roomName;

    // 发送房间 ID 来加入房间
    terminalState.wsClient.sendMsg(roomId.toString());

    closeRoomModal();
    // 不要立即显示成功消息，等待服务器确认
  };

  window.selectGameType = function (gameType) {
    addOutput(`Creating ${gameType === 'landlord' ? 'Landlord' : 'Texas Hold\'em'} room...`, 'info');

    // Send create room command based on game type
    if (gameType === 'landlord') {
      terminalState.wsClient.send(window.ClientEventCodes.CODE_ROOM_CREATE_PVP);
    } else {
      // For Texas Hold'em, might need different code
      terminalState.wsClient.send(window.ClientEventCodes.CODE_ROOM_CREATE_PVP, '5');
    }

    closeGameTypeModal();
    addOutput('Room created successfully!', 'success');
    terminalState.currentRoom = `New ${gameType} room`;
  };

  // Format game messages for better readability
  function formatGameMessage(message) {
    // 将长消息按关键词分行
    let formatted = message;

    // 定义需要在其前面换行的关键词
    const breakBeforePatterns = [
      'Your hand:',
      'Board:',
      'Winner:',
      'Small blind:',
      'Big blind:',
      'You are small blind',
      'You are big blind',
      'Pre-flop round',
      'Flop round',
      'Turn round',
      'River round',
      'Settlement round',
      'What do you want to do?',
      'Please room owner',
      'Game starting!',
      '>> joined room!',
      '>> fold',
      '>> call',
      '>> raise',
      '>> check',
      '>> allin',
      '>> Settlement'
    ];

    // 对每个模式进行替换
    breakBeforePatterns.forEach(pattern => {
      const regex = new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
      formatted = formatted.replace(regex, '\n$1');
    });

    // 特殊处理玩家金额信息，在每个玩家信息前换行
    formatted = formatted.replace(/(\w+ amount \d+)/g, '\n$1');

    // 格式化扑克牌显示，添加空格
    formatted = formatted.replace(/([♠♥♦♣])(\w+)/g, '$1$2 ');

    // 清理多余的换行和空格
    formatted = formatted.split('\n').map(line => line.trim()).filter(line => line).join('\n');

    return formatted;
  }

  // Add a single line to output
  function addSingleLine(line, type = 'default') {
    if (!line.trim()) return;

    const lineElement = document.createElement('div');
    lineElement.className = `output-line ${type}`;

    // 如果包含扑克牌符号，使用innerHTML来支持样式
    if (line.includes('[♠') || line.includes('[♥') || line.includes('[♦') || line.includes('[♣')) {
      // 为不同花色的牌添加不同颜色
      let styledLine = line
        .replace(/\[([♠♣]\w+)\]/g, '<span style="color: #00ff41; font-weight: bold;">$1</span>')  // 黑桃和梅花 - 使用终端绿色
        .replace(/\[([♥♦]\w+)\]/g, '<span style="color: #ff4444; font-weight: bold;">$1</span>'); // 红心和方块 - 保持红色
      lineElement.innerHTML = styledLine;
    } else {
      lineElement.textContent = line;
    }

    elements.output.appendChild(lineElement);

    // 立即滚动到底部
    autoScrollToBottom();
  }

  // Auto scroll to bottom
  function autoScrollToBottom() {
    if (elements.output) {
      // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
      requestAnimationFrame(() => {
        elements.output.scrollTop = elements.output.scrollHeight;
      });
    }
  }

  // Utility functions
  function addOutput(message, type = 'default') {
    // 如果消息包含换行符，分别输出每一行
    const lines = message.split('\n');
    lines.forEach(line => {
      addSingleLine(line.trim(), type);
    });
  }

  function updateConnectionStatus(status, text) {
    elements.connectionStatus.className = `status-${status}`;
    elements.connectionStatus.textContent = text;
  }

  // Initialize when DOM is ready
  console.log('Modern Terminal: Checking document ready state:', document.readyState);

  if (document.readyState === 'loading') {
    console.log('Modern Terminal: Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('Modern Terminal: DOM already loaded, initializing now');
    // 使用 setTimeout 确保所有脚本都已加载
    setTimeout(init, 100);
  }
})();