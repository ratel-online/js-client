; (function (window) {
    'use strict';

    function Toggleable(el) {
        this.targetEl = el;
        this.visible = true;
    };

    Toggleable.prototype.triggerBy = function (eventType, predicate) {
        try {
            this.targetEl.addEventListener(eventType, (e) => {
                e.preventDefault();

                if (predicate.call(null, e, "hide") && this.visible) {
                    this.hide();
                    this.visible = !this.visible;
                }

                return false;
            }, false);

            document.addEventListener(eventType, (e) => {
                e.preventDefault();

                if (predicate.call(null, e, "show") && !this.visible) {
                    this.show();
                    this.visible = !this.visible;
                }

                return false;
            }, false);

            // Modern terminal 不需要 iframe 支持，跳过 iframe 相关的事件监听
        } catch (e) {
            console.error(e);
            throw new Error("Unknown event type");
        }
    };

    Toggleable.prototype.hide = function () {
        this.targetEl.style.visibility = "hidden";
    };

    Toggleable.prototype.show = function () {
        this.targetEl.style.visibility = "visible";
        var inputEl = this.targetEl.querySelector("input");
        if (inputEl) {
            inputEl.focus();
        }
    };

    window.Toggleable = Toggleable;
}(this));