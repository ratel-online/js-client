; (function (window) {
  'use strict';

  function ConnectionStatus() {
    this.statusElement = null;
    this.statusTextElement = null;
    this.statusIconElement = null;
    this.latencyElement = null;
    this.init();
  }

  ConnectionStatus.prototype.init = function () {
    // 创建状态显示容器
    const container = document.createElement('div');
    container.id = 'connection-status-container';
    container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;

    // 状态图标
    this.statusIconElement = document.createElement('span');
    this.statusIconElement.id = 'status-icon';
    this.statusIconElement.style.cssText = 'font-size: 16px;';

    // 状态文本
    this.statusTextElement = document.createElement('span');
    this.statusTextElement.id = 'status-text';

    // 延迟显示
    this.latencyElement = document.createElement('span');
    this.latencyElement.id = 'status-latency';
    this.latencyElement.style.cssText = 'font-size: 12px; opacity: 0.8;';

    container.appendChild(this.statusIconElement);
    container.appendChild(this.statusTextElement);
    container.appendChild(this.latencyElement);

    // 添加到页面
    document.body.appendChild(container);
    this.statusElement = container;

    // 添加点击事件显示详细信息
    container.addEventListener('click', () => {
      this.showDetailedStatus();
    });
  };

  ConnectionStatus.prototype.update = function (status, text, latency) {
    if (!this.statusElement) return;

    const configs = {
      'connecting': {
        icon: '🟡',
        color: '#ff9800',
        text: text || '连接中...'
      },
      'connected': {
        icon: '🟢',
        color: '#4CAF50',
        text: text || '已连接'
      },
      'disconnected': {
        icon: '🔴',
        color: '#f44336',
        text: text || '已断开'
      },
      'reconnecting': {
        icon: '🟠',
        color: '#ff9800',
        text: text || '重连中...'
      },
      'error': {
        icon: '❌',
        color: '#f44336',
        text: text || '连接错误'
      }
    };

    const config = configs[status] || configs['disconnected'];

    this.statusIconElement.textContent = config.icon;
    this.statusTextElement.textContent = config.text;
    this.statusTextElement.style.color = config.color;

    // 更新延迟显示
    if (latency !== undefined && status === 'connected') {
      this.latencyElement.textContent = `(${latency}ms)`;
      this.latencyElement.style.display = 'inline';
    } else {
      this.latencyElement.style.display = 'none';
    }

    // 添加动画效果
    this.statusElement.style.animation = 'pulse 0.5s ease-in-out';
    setTimeout(() => {
      this.statusElement.style.animation = '';
    }, 500);
  };

  ConnectionStatus.prototype.showDetailedStatus = function () {
    // 创建详细状态模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            color: black;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            min-width: 300px;
        `;

    const wsClient = window.wsClient;
    const details = `
            <h3 style="margin-top: 0;">连接详情</h3>
            <p><strong>服务器地址:</strong> ${wsClient ? wsClient.url : '未连接'}</p>
            <p><strong>连接状态:</strong> ${wsClient ? wsClient.connectionState : '未知'}</p>
            <p><strong>重连次数:</strong> ${wsClient ? wsClient.reconnectAttempts : 0}</p>
            <p><strong>心跳延迟:</strong> ${this.latencyElement.textContent || '未知'}</p>
            <button onclick="this.parentElement.remove()" style="
                background: #2196F3;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">关闭</button>
        `;

    modal.innerHTML = details;
    document.body.appendChild(modal);

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', function closeModal(e) {
        if (!modal.contains(e.target)) {
          modal.remove();
          document.removeEventListener('click', closeModal);
        }
      });
    }, 100);
  };

  // 添加 CSS 动画
  const style = document.createElement('style');
  style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        #connection-status-container:hover {
            cursor: pointer;
            transform: scale(1.05);
        }
    `;
  document.head.appendChild(style);

  // 导出到全局
  window.ConnectionStatus = ConnectionStatus;

})(window); 