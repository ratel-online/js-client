; (function (window) {
  'use strict';

  function NetworkMonitor() {
    this.isOnline = navigator.onLine;
    this.connectionType = this.getConnectionType();
    this.listeners = [];
    this.qualityCheckInterval = null;
    this.lastQuality = 'good';
    this.init();
  }

  NetworkMonitor.prototype.init = function () {
    // 监听在线/离线事件
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });

    // 监听网络类型变化
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.connectionType = this.getConnectionType();
        this.notifyListeners('typechange', this.connectionType);
      });
    }

    // 开始质量检测
    this.startQualityCheck();
  };

  NetworkMonitor.prototype.getConnectionType = function () {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        type: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      };
    }
    return { type: 'unknown' };
  };

  NetworkMonitor.prototype.startQualityCheck = function () {
    this.qualityCheckInterval = setInterval(() => {
      this.checkNetworkQuality();
    }, 5000); // 每5秒检测一次
  };

  NetworkMonitor.prototype.checkNetworkQuality = function () {
    if (!this.isOnline) {
      this.updateQuality('offline');
      return;
    }

    // 基于连接类型评估网络质量
    const conn = this.getConnectionType();
    let quality = 'good';

    if (conn.type === 'slow-2g' || conn.type === '2g') {
      quality = 'poor';
    } else if (conn.type === '3g') {
      quality = 'fair';
    } else if (conn.rtt > 300) {
      quality = 'fair';
    } else if (conn.rtt > 500) {
      quality = 'poor';
    }

    if (quality !== this.lastQuality) {
      this.lastQuality = quality;
      this.notifyListeners('qualitychange', quality);
    }
  };

  NetworkMonitor.prototype.updateQuality = function (quality) {
    if (quality !== this.lastQuality) {
      this.lastQuality = quality;
      this.notifyListeners('qualitychange', quality);
    }
  };

  NetworkMonitor.prototype.addListener = function (callback) {
    this.listeners.push(callback);
  };

  NetworkMonitor.prototype.removeListener = function (callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  };

  NetworkMonitor.prototype.notifyListeners = function (event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        console.error('NetworkMonitor listener error:', e);
      }
    });
  };

  NetworkMonitor.prototype.getQualityInfo = function () {
    const qualityMap = {
      'good': { text: '网络良好', color: '#4CAF50', icon: '🟢' },
      'fair': { text: '网络一般', color: '#ff9800', icon: '🟡' },
      'poor': { text: '网络较差', color: '#f44336', icon: '🔴' },
      'offline': { text: '已离线', color: '#9e9e9e', icon: '⚫' }
    };
    return qualityMap[this.lastQuality] || qualityMap['good'];
  };

  NetworkMonitor.prototype.destroy = function () {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }
    this.listeners = [];
  };

  // 导出到全局
  window.NetworkMonitor = NetworkMonitor;

})(window); 