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
    historyIndex: -1
  };

  // DOM elements
  const elements = {
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
    // Focus on nickname input
    elements.nicknameInput.focus();

    // Event listeners
    elements.nicknameInput.addEventListener('keypress', handleNicknameInput);
    elements.commandInput.addEventListener('keypress', handleCommandInput);
    elements.commandInput.addEventListener('keydown', handleCommandNavigation);

    // Add terminal control event listeners
    document.querySelector('.control.close').addEventListener('click', () => {
      if (confirm('Are you sure you want to exit?')) {
        window.location.href = 'index.html';
      }
    });

    document.querySelector('.control.minimize').addEventListener('click', () => {
      document.querySelector('.terminal-container').style.transform = 'scale(0.9)';
      setTimeout(() => {
        document.querySelector('.terminal-container').style.transform = 'scale(1)';
      }, 300);
    });

    document.querySelector('.control.maximize').addEventListener('click', () => {
      document.querySelector('.terminal-container').classList.toggle('fullscreen');
    });

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

    // Check for command
    if (commands[command]) {
      commands[command].execute(parts.slice(1));
    } else {
      addOutput(`Command not found: ${command}. Type 'help' for available commands.`, 'error');
    }
  }

  // Connect WebSocket
  function connectWebSocket(nickname) {
    addOutput(`Connecting as ${nickname}...`, 'info');
    updateConnectionStatus('connecting', 'Connecting...');

    // Hide nickname input, show command input
    elements.nicknameContainer.style.display = 'none';
    elements.commandContainer.style.display = 'flex';
    elements.userPrompt.textContent = `${nickname}@ratel:~$ `;
    elements.commandInput.focus();

    // Get WebSocket URL from config
    const wsUrl = window.RatelConfig?.wsUrl || 'wss://ratel-be.cheverjohn.me/ws';

    // Create WebSocket client
    terminalState.wsClient = new window.WsClient(wsUrl);

    // Override panel methods to integrate with terminal
    terminalState.wsClient.panel.append = function (message) {
      // Parse and display message in terminal
      if (typeof message === 'string') {
        // Remove HTML tags for terminal display
        const cleanMessage = message.replace(/<[^>]*>/g, '');
        addOutput(cleanMessage, 'info');
      }
    };

    terminalState.wsClient.panel.waitInput = function () {
      // Terminal is always ready for input
      return Promise.resolve();
    };

    // Initialize WebSocket connection
    terminalState.wsClient.init().then(() => {
      terminalState.connected = true;
      updateConnectionStatus('connected', 'Connected');
      addOutput('Successfully connected to server!', 'success');
      addOutput('Type "help" to see available commands or:', 'info');
      addOutput('  1. Join - Join an existing room', 'info');
      addOutput('  2. New  - Create a new room', 'info');

      // Set nickname
      terminalState.wsClient.setUserName(nickname);
      terminalState.wsClient.send(window.ClientEventCodes.CODE_CLIENT_NICKNAME_SET, nickname);
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

    // Send request to get room list
    terminalState.wsClient.send(window.ClientEventCodes.CODE_SHOW_OPTIONS_PVP);

    // Show room selection modal
    setTimeout(() => {
      showRoomModal();
    }, 500);
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
    // Populate with sample rooms (this would come from server)
    elements.roomList.innerHTML = `
            <div class="room-item" onclick="selectRoom('Room #1', 43)">
                <div class="room-name">Room #1</div>
                <div class="room-info">ID: 43 | Players: 2/3 | Status: Waiting</div>
            </div>
            <div class="room-item" onclick="selectRoom('Room #2', 44)">
                <div class="room-name">Room #2</div>
                <div class="room-info">ID: 44 | Players: 1/3 | Status: Waiting</div>
            </div>
            <div class="room-item" onclick="selectRoom('Room #3', 45)">
                <div class="room-name">Room #3</div>
                <div class="room-info">ID: 45 | Players: 0/3 | Status: Empty</div>
            </div>
        `;
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

    // Send join room command
    terminalState.wsClient.send(window.ClientEventCodes.CODE_ROOM_JOIN, roomId);

    closeRoomModal();
    addOutput(`Successfully joined ${roomName}!`, 'success');
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

  // Utility functions
  function addOutput(message, type = 'default') {
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = message;
    elements.output.appendChild(line);

    // Auto scroll to bottom
    elements.output.scrollTop = elements.output.scrollHeight;
  }

  function updateConnectionStatus(status, text) {
    elements.connectionStatus.className = `status-${status}`;
    elements.connectionStatus.textContent = text;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();