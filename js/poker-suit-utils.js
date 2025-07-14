; (function (window) {
  'use strict';

  /**
   * Poker Suit Color Utilities
   * Provides consistent color handling for poker suits across the application
   */
  var PokerSuitUtils = {
    // Suit symbols
    SUITS: {
      SPADE: '♠',
      HEART: '♥',
      DIAMOND: '♦',
      CLUB: '♣'
    },

    // Suit colors according to requirements
    COLORS: {
      RED: '#FF0000',
      GREEN: '#00FF00'
    },

    // CSS classes
    CLASSES: {
      HEART: 'suit-heart',
      DIAMOND: 'suit-diamond',
      SPADE: 'suit-spade',
      CLUB: 'suit-club',
      RED: 'poker-suit-red',
      GREEN: 'poker-suit-green'
    },

    /**
     * Get the appropriate CSS class for a suit symbol
     * @param {string} suit - The suit symbol or character
     * @returns {string} The CSS class name
     */
    getSuitClass: function (suit) {
      switch (suit) {
        case this.SUITS.HEART:
        case 'H':
        case 'HEART':
          return this.CLASSES.HEART;
        case this.SUITS.DIAMOND:
        case 'D':
        case 'DIAMOND':
          return this.CLASSES.DIAMOND;
        case this.SUITS.SPADE:
        case 'S':
        case 'SPADE':
          return this.CLASSES.SPADE;
        case this.SUITS.CLUB:
        case 'C':
        case 'CLUB':
          return this.CLASSES.CLUB;
        default:
          return '';
      }
    },

    /**
     * Get the color for a suit
     * @param {string} suit - The suit symbol or character
     * @returns {string} The color hex code
     */
    getSuitColor: function (suit) {
      switch (suit) {
        case this.SUITS.HEART:
        case 'H':
        case 'HEART':
        case this.SUITS.DIAMOND:
        case 'D':
        case 'DIAMOND':
          return this.COLORS.RED;
        case this.SUITS.SPADE:
        case 'S':
        case 'SPADE':
        case this.SUITS.CLUB:
        case 'C':
        case 'CLUB':
          return this.COLORS.GREEN;
        default:
          return '';
      }
    },

    /**
     * Wrap a suit symbol with appropriate color styling
     * @param {string} suit - The suit symbol
     * @param {string} value - The card value (optional)
     * @returns {string} HTML string with styled suit
     */
    formatSuit: function (suit, value) {
      var suitClass = this.getSuitClass(suit);
      var suitSymbol = this.getSuitSymbol(suit);

      if (value) {
        return '<span class="' + suitClass + '">' + value + suitSymbol + '</span>';
      } else {
        return '<span class="' + suitClass + '">' + suitSymbol + '</span>';
      }
    },

    /**
     * Convert suit character to symbol
     * @param {string} suit - The suit character (S, H, D, C)
     * @returns {string} The suit symbol
     */
    getSuitSymbol: function (suit) {
      switch (suit) {
        case 'S':
        case 'SPADE':
          return this.SUITS.SPADE;
        case 'H':
        case 'HEART':
          return this.SUITS.HEART;
        case 'D':
        case 'DIAMOND':
          return this.SUITS.DIAMOND;
        case 'C':
        case 'CLUB':
          return this.SUITS.CLUB;
        default:
          return suit; // Return as-is if already a symbol
      }
    },

    /**
     * Apply suit colors to a text containing poker cards
     * @param {string} text - Text containing poker cards
     * @returns {string} HTML string with colored suits
     */
    colorizePokerText: function (text) {
      // Replace suit symbols with colored versions
      return text
        .replace(/([♥♦])(\w*)/g, '<span class="poker-suit-red">$1$2</span>')
        .replace(/([♠♣])(\w*)/g, '<span class="poker-suit-green">$1$2</span>');
    }
  };

  // Export to window
  window.PokerSuitUtils = PokerSuitUtils;

})(window); 