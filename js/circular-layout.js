// Circular Seat Layout JavaScript
(function (window) {
  'use strict';

  // CircularLayout class
  function CircularLayout() {
    this.container = null;
    this.layoutElement = null;
    this.players = new Map(); // Map of playerId -> playerData
    this.myPlayerId = null;
    this.roomId = null;
    this.hostId = null;
    this.currentTurnPlayerId = null;
    this.pot = 0;
    this.communityCards = [];
    this.gameStage = 'Waiting';
    this.seatPositions = [];
    this.maxPlayers = 10;
    this.isVisible = false;
    this.autoRefreshInterval = null;
    this.wsClient = null;

    // Bind methods
    this.init = this.init.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.updatePlayers = this.updatePlayers.bind(this);
    this.updateGameState = this.updateGameState.bind(this);
    this.handlePlayerAction = this.handlePlayerAction.bind(this);
  }

  // Initialize the layout
  CircularLayout.prototype.init = function (wsClient) {
    this.wsClient = wsClient;
    this.container = document.getElementById('circular-layout-container');
    this.layoutElement = document.getElementById('circular-layout');

    if (!this.container || !this.layoutElement) {
      console.error('Circular layout elements not found');
      return;
    }

    // Calculate seat positions
    this.calculateSeatPositions();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize with empty seats
    this.renderEmptySeats();
  };

  // Calculate seat positions in a circle
  CircularLayout.prototype.calculateSeatPositions = function () {
    const wrapper = this.layoutElement.parentElement;
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 80; // Leave space for seats

    this.seatPositions = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      // Start from top (12 o'clock) and go clockwise
      const angle = (i * 360 / this.maxPlayers - 90) * Math.PI / 180;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      this.seatPositions.push({ x, y, seatNumber: i + 1 });
    }
  };

  // Render empty seats
  CircularLayout.prototype.renderEmptySeats = function () {
    // Clear existing seats (except center area)
    const seats = this.layoutElement.querySelectorAll('.player-seat');
    seats.forEach(seat => seat.remove());

    // Add empty seats
    this.seatPositions.forEach((pos, index) => {
      const seat = this.createEmptySeat(index + 1);
      seat.style.left = pos.x - 50 + 'px'; // Center the seat
      seat.style.top = pos.y - 60 + 'px';
      this.layoutElement.appendChild(seat);
    });
  };

  // Create empty seat element
  CircularLayout.prototype.createEmptySeat = function (seatNumber) {
    const seat = document.createElement('div');
    seat.className = 'player-seat empty';
    seat.dataset.seatNumber = seatNumber;
    seat.innerHTML = `
            <div class="empty-seat-content">
                <div class="seat-number">#${seatNumber}</div>
                <div class="empty-text">Empty</div>
            </div>
        `;
    return seat;
  };

  // Create player seat element
  CircularLayout.prototype.createPlayerSeat = function (player, seatNumber) {
    const seat = document.createElement('div');
    seat.className = 'player-seat';
    seat.dataset.playerId = player.id;
    seat.dataset.seatNumber = seatNumber;

    // Add special classes
    if (player.id === this.myPlayerId) {
      seat.classList.add('my-seat');
    }
    if (player.id === this.hostId) {
      seat.classList.add('host-seat');
    }
    if (player.id === this.currentTurnPlayerId) {
      seat.classList.add('current-turn');
    }
    if (player.status === 'folded') {
      seat.classList.add('folded');
    }
    if (player.isWinner) {
      seat.classList.add('winner');
    }

    // Build seat content
    const avatarClasses = ['player-avatar'];
    if (player.isHost) avatarClasses.push('host');
    if (player.isDealer) avatarClasses.push('dealer');
    if (player.isSmallBlind) avatarClasses.push('small-blind');
    if (player.isBigBlind) avatarClasses.push('big-blind');

    seat.innerHTML = `
            <div class="${avatarClasses.join(' ')}">
                ${player.nickname.charAt(0).toUpperCase()}
            </div>
            <div class="player-name" title="${player.nickname}">${player.nickname}</div>
            <div class="player-balance">$${this.formatAmount(player.balance || 0)}</div>
            ${player.currentBet ? `<div class="player-bet">Bet: $${this.formatAmount(player.currentBet)}</div>` : ''}
            ${player.status && player.status !== 'active' ? `<div class="player-status">${player.status}</div>` : ''}
            ${player.id === this.currentTurnPlayerId ? '<div class="player-timer"><span class="timer-text">60s</span><div class="timer-progress"></div></div>' : ''}
        `;

    // Add player cards if visible
    if (player.cards && player.cards.length > 0) {
      const cardsDiv = document.createElement('div');
      cardsDiv.className = 'player-cards';
      player.cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'player-card';
        cardDiv.textContent = this.formatCard(card);
        cardsDiv.appendChild(cardDiv);
      });
      seat.appendChild(cardsDiv);
    }

    return seat;
  };

  // Format card for display
  CircularLayout.prototype.formatCard = function (card) {
    if (!card || card === 'hidden') return '?';
    // Convert card format if needed
    const suits = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
    const value = card.substring(0, card.length - 1);
    const suit = card.charAt(card.length - 1);
    return value + (suits[suit] || suit);
  };

  // Format amount for display
  CircularLayout.prototype.formatAmount = function (amount) {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  };

  // Update players in the layout
  CircularLayout.prototype.updatePlayers = function (playersData) {
    // Clear current players
    this.players.clear();

    // Process players data
    if (Array.isArray(playersData)) {
      playersData.forEach((player, index) => {
        // Assign seat number based on join order (index + 1)
        player.seatNumber = index + 1;
        this.players.set(player.id, player);
      });
    } else if (typeof playersData === 'object') {
      // If it's an object, convert to array first
      const playersArray = Object.values(playersData);
      playersArray.forEach((player, index) => {
        player.seatNumber = index + 1;
        this.players.set(player.id, player);
      });
    }

    // Render players
    this.renderPlayers();

    // Update player count
    this.updatePlayerCount();
  };

  // Render all players
  CircularLayout.prototype.renderPlayers = function () {
    // First render empty seats
    this.renderEmptySeats();

    // Then add players to their seats
    this.players.forEach(player => {
      const seatIndex = player.seatNumber - 1;
      if (seatIndex >= 0 && seatIndex < this.maxPlayers) {
        const pos = this.seatPositions[seatIndex];
        const existingSeat = this.layoutElement.querySelector(`.player-seat[data-seat-number="${player.seatNumber}"]`);

        if (existingSeat) {
          // Replace empty seat with player seat
          const playerSeat = this.createPlayerSeat(player, player.seatNumber);
          playerSeat.style.left = pos.x - 50 + 'px';
          playerSeat.style.top = pos.y - 60 + 'px';
          existingSeat.replaceWith(playerSeat);
        }
      }
    });
  };

  // Update player count display
  CircularLayout.prototype.updatePlayerCount = function () {
    const countElement = document.getElementById('players-count');
    if (countElement) {
      countElement.textContent = `${this.players.size}/${this.maxPlayers}`;
    }
  };

  // Update game state
  CircularLayout.prototype.updateGameState = function (gameData) {
    // Update pot
    if (gameData.pot !== undefined) {
      this.pot = gameData.pot;
      const potElement = document.getElementById('pot-amount');
      if (potElement) {
        potElement.textContent = '$' + this.formatAmount(this.pot);
      }
    }

    // Update community cards
    if (gameData.communityCards) {
      this.communityCards = gameData.communityCards;
      this.renderCommunityCards();
    }

    // Update game stage
    if (gameData.stage) {
      this.gameStage = gameData.stage;
      const stageElement = document.getElementById('game-stage');
      if (stageElement) {
        stageElement.textContent = this.gameStage;
      }
    }

    // Update current turn
    if (gameData.currentTurnPlayerId !== undefined) {
      this.setCurrentTurn(gameData.currentTurnPlayerId);
    }

    // Update player specific data
    if (gameData.players) {
      this.updatePlayers(gameData.players);
    }
  };

  // Render community cards
  CircularLayout.prototype.renderCommunityCards = function () {
    const container = document.getElementById('community-cards');
    if (!container) return;

    container.innerHTML = '';
    this.communityCards.forEach(card => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'community-card';
      cardDiv.textContent = this.formatCard(card);
      container.appendChild(cardDiv);
    });
  };

  // Set current turn player
  CircularLayout.prototype.setCurrentTurn = function (playerId) {
    // Remove current turn from all seats
    const seats = this.layoutElement.querySelectorAll('.player-seat');
    seats.forEach(seat => seat.classList.remove('current-turn'));

    // Add current turn to specific player
    this.currentTurnPlayerId = playerId;
    const currentSeat = this.layoutElement.querySelector(`.player-seat[data-player-id="${playerId}"]`);
    if (currentSeat) {
      currentSeat.classList.add('current-turn');

      // Start timer if it's our turn
      if (playerId === this.myPlayerId) {
        this.showActionPanel();
        this.startTurnTimer(currentSeat);
      } else {
        this.hideActionPanel();
      }
    }
  };

  // Start turn timer
  CircularLayout.prototype.startTurnTimer = function (seat) {
    const timerElement = seat.querySelector('.player-timer');
    if (!timerElement) return;

    const timerText = timerElement.querySelector('.timer-text');
    const timerProgress = timerElement.querySelector('.timer-progress');

    let timeLeft = 60;
    const interval = setInterval(() => {
      timeLeft--;
      if (timerText) {
        timerText.textContent = timeLeft + 's';
      }
      if (timerProgress) {
        timerProgress.style.width = ((60 - timeLeft) / 60 * 100) + '%';
      }

      if (timeLeft <= 0) {
        clearInterval(interval);
        // Auto-fold or check if time runs out
        this.handlePlayerAction('fold');
      }
    }, 1000);

    // Store interval to clear later
    seat.dataset.timerInterval = interval;
  };

  // Show action panel
  CircularLayout.prototype.showActionPanel = function () {
    const panel = document.getElementById('game-actions-panel');
    if (panel) {
      panel.style.display = 'block';
    }
  };

  // Hide action panel
  CircularLayout.prototype.hideActionPanel = function () {
    const panel = document.getElementById('game-actions-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  };

  // Handle player action
  CircularLayout.prototype.handlePlayerAction = function (action, amount) {
    if (!this.wsClient) return;

    // Send action to server
    let command = action;
    if (action === 'raise' && amount) {
      command = `raise ${amount}`;
    }

    this.wsClient.sendMsg(command);

    // Hide action panel
    this.hideActionPanel();
  };

  // Setup event listeners
  CircularLayout.prototype.setupEventListeners = function () {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-layout');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }

    // Toggle fullscreen button
    const toggleBtn = document.getElementById('toggle-layout');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // Action buttons
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'raise') {
          this.showRaiseControls();
        } else {
          this.handlePlayerAction(action);
        }
      });
    });

    // Raise controls
    const raiseSlider = document.getElementById('raise-slider');
    const raiseInput = document.getElementById('raise-input');
    const confirmRaise = document.getElementById('confirm-raise');

    if (raiseSlider && raiseInput) {
      raiseSlider.addEventListener('input', (e) => {
        raiseInput.value = e.target.value;
      });

      raiseInput.addEventListener('input', (e) => {
        raiseSlider.value = e.target.value;
      });
    }

    if (confirmRaise) {
      confirmRaise.addEventListener('click', () => {
        const amount = raiseInput.value;
        if (amount > 0) {
          this.handlePlayerAction('raise', amount);
          this.hideRaiseControls();
        }
      });
    }
  };

  // Show raise controls
  CircularLayout.prototype.showRaiseControls = function () {
    const controls = document.getElementById('raise-controls');
    if (controls) {
      controls.style.display = 'flex';
    }
  };

  // Hide raise controls
  CircularLayout.prototype.hideRaiseControls = function () {
    const controls = document.getElementById('raise-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  };

  // Toggle fullscreen
  CircularLayout.prototype.toggleFullscreen = function () {
    if (this.container) {
      this.container.classList.toggle('fullscreen');
      // Recalculate positions after resize
      setTimeout(() => {
        this.calculateSeatPositions();
        this.renderPlayers();
      }, 300);
    }
  };

  // Refresh layout data
  CircularLayout.prototype.refresh = function () {
    if (this.wsClient) {
      // Send 'v' command to get player data
      this.wsClient.sendMsg('v');
    }
  };

  // Show the layout
  CircularLayout.prototype.show = function (roomId) {
    this.roomId = roomId;
    this.isVisible = true;

    if (this.container) {
      this.container.style.display = 'flex';

      // Update room number
      const roomNumberElement = document.getElementById('room-number');
      if (roomNumberElement) {
        roomNumberElement.textContent = roomId;
      }

      // Start auto-refresh
      this.startAutoRefresh();

      // Initial refresh
      this.refresh();
    }
  };

  // Hide the layout
  CircularLayout.prototype.hide = function () {
    this.isVisible = false;

    if (this.container) {
      this.container.style.display = 'none';
    }

    // Stop auto-refresh
    this.stopAutoRefresh();

    // Clear data
    this.players.clear();
    this.currentTurnPlayerId = null;
    this.pot = 0;
    this.communityCards = [];
    this.gameStage = 'Waiting';
  };

  // Start auto-refresh
  CircularLayout.prototype.startAutoRefresh = function () {
    // Refresh every 5 seconds
    this.autoRefreshInterval = setInterval(() => {
      if (this.isVisible) {
        this.refresh();
      }
    }, 5000);
  };

  // Stop auto-refresh
  CircularLayout.prototype.stopAutoRefresh = function () {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  };

  // Parse 'v' command response
  CircularLayout.prototype.parseViewResponse = function (response) {
    // This will parse the response from 'v' command
    // The format varies based on game type, but for Texas Hold'em it typically includes:
    // - Player positions, names, amounts, and statuses
    // - Current pot
    // - Community cards
    // - Current turn info

    const lines = response.split('\n');
    const players = [];
    let currentPot = 0;
    let communityCards = [];
    let gameStage = 'Unknown';
    let dealerName = null;
    let currentTurnName = null;

    lines.forEach(line => {
      // 跳过空行
      if (!line.trim()) return;

      // 解析玩家信息 - 德州扑克格式通常是: "位置 昵称 金额 [状态]"
      // 例如: "1 player1 $1000" 或 "2 player2 $800 (folded)"
      const playerMatch = line.match(/^(\d+)\s+(\w+)\s+\$?(\d+)(?:\s+\(([^)]+)\))?/);
      if (playerMatch) {
        const [, position, nickname, amount, status] = playerMatch;
        const player = {
          id: nickname,
          nickname: nickname,
          balance: parseInt(amount),
          status: status || 'active',
          position: parseInt(position),
          currentBet: 0
        };

        // 检查特殊标记
        if (line.includes('(D)') || line.includes('庄家')) {
          player.isDealer = true;
          dealerName = nickname;
        }
        if (line.includes('(SB)') || line.includes('小盲')) {
          player.isSmallBlind = true;
        }
        if (line.includes('(BB)') || line.includes('大盲')) {
          player.isBigBlind = true;
        }
        if (line.includes('(Host)') || line.includes('房主')) {
          player.isHost = true;
        }
        if (line.includes('*') || line.includes('当前')) {
          currentTurnName = nickname;
        }

        players.push(player);
      }

      // 解析底池信息
      const potMatch = line.match(/pot[:\s]*\$?(\d+)/i);
      if (potMatch) {
        currentPot = parseInt(potMatch[1]);
      }

      // 解析公共牌
      const cardsMatch = line.match(/(?:community cards?|board)[:\s]*(.*)/i);
      if (cardsMatch) {
        // 提取卡牌格式，例如: ♠A ♥K ♦Q
        const cardPattern = /[♠♥♦♣][A-Z0-9]+/g;
        communityCards = cardsMatch[1].match(cardPattern) || [];
      }

      // 解析游戏阶段
      if (line.toLowerCase().includes('pre-flop') || line.includes('翻牌前')) {
        gameStage = 'Pre-flop';
      } else if (line.toLowerCase().includes('flop') || line.includes('翻牌')) {
        gameStage = 'Flop';
      } else if (line.toLowerCase().includes('turn') || line.includes('转牌')) {
        gameStage = 'Turn';
      } else if (line.toLowerCase().includes('river') || line.includes('河牌')) {
        gameStage = 'River';
      } else if (line.toLowerCase().includes('showdown') || line.includes('摊牌')) {
        gameStage = 'Showdown';
      }

      // 解析下注信息
      const betMatch = line.match(/(\w+).*?(?:bet|raise|call|check|fold|all-in).*?\$?(\d+)?/i);
      if (betMatch) {
        const [, playerName, amount] = betMatch;
        const player = players.find(p => p.nickname === playerName);
        if (player && amount) {
          player.currentBet = parseInt(amount);
        }
      }
    });

    // 设置当前行动玩家
    let currentTurnPlayerId = null;
    if (currentTurnName) {
      const currentPlayer = players.find(p => p.nickname === currentTurnName);
      if (currentPlayer) {
        currentTurnPlayerId = currentPlayer.id;
      }
    }

    return {
      players: players,
      pot: currentPot,
      communityCards: communityCards,
      stage: gameStage,
      currentTurnPlayerId: currentTurnPlayerId
    };
  };

  // Handle incoming game data
  CircularLayout.prototype.handleGameData = function (data) {
    // This method will be called by the WebSocket client when game data is received
    if (typeof data === 'string') {
      // If it's a string response (like from 'v' command), parse it
      const gameData = this.parseViewResponse(data);
      this.updateGameState(gameData);
    } else if (typeof data === 'object') {
      // If it's already an object, use it directly
      this.updateGameState(data);
    }
  };

  // Set player info
  CircularLayout.prototype.setPlayerInfo = function (playerId, isHost) {
    this.myPlayerId = playerId;
    if (isHost) {
      this.hostId = playerId;
    }
  };

  // Add styles for empty seats
  const style = document.createElement('style');
  style.textContent = `
        .player-seat.empty {
            opacity: 0.3;
            border-style: dashed;
        }
        
        .empty-seat-content {
            text-align: center;
        }
        
        .seat-number {
            font-size: 18px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .empty-text {
            font-size: 12px;
            color: #666;
        }
        
        .player-seat.my-seat {
            border-color: var(--accent-color);
            background: rgba(0, 255, 65, 0.1);
        }
        
        .player-seat.host-seat .player-name::before {
            content: '👑 ';
        }
    `;
  document.head.appendChild(style);

  // Export to window
  window.CircularLayout = CircularLayout;

})(window); 