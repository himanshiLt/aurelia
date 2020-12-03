(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WatcherSwitcher = exports.exitWatcher = exports.enterWatcher = exports.currentWatcher = exports.resumeWatching = exports.pauseWatching = exports.watching = void 0;
    /**
     * Current subscription collector
     */
    let $watcher = null;
    const watchers = [];
    // eslint-disable-next-line
    exports.watching = false;
    // todo: layer based collection pause/resume?
    function pauseWatching() {
        exports.watching = false;
    }
    exports.pauseWatching = pauseWatching;
    function resumeWatching() {
        exports.watching = true;
    }
    exports.resumeWatching = resumeWatching;
    function currentWatcher() {
        return $watcher;
    }
    exports.currentWatcher = currentWatcher;
    function enterWatcher(watcher) {
        if (watcher == null) {
            throw new Error('watcher cannot be null/undefined');
        }
        if ($watcher == null) {
            $watcher = watcher;
            watchers[0] = $watcher;
            exports.watching = true;
            return;
        }
        if ($watcher === watcher) {
            throw new Error(`Already in this watcher ${watcher.id}`);
        }
        watchers.push($watcher);
        $watcher = watcher;
        exports.watching = true;
    }
    exports.enterWatcher = enterWatcher;
    function exitWatcher(watcher) {
        if (watcher == null) {
            throw new Error('watcher cannot be null/undefined');
        }
        if ($watcher !== watcher) {
            throw new Error(`${watcher.id} is not currently collecting`);
        }
        watchers.pop();
        $watcher = watchers.length > 0 ? watchers[watchers.length - 1] : null;
        exports.watching = $watcher != null;
    }
    exports.exitWatcher = exitWatcher;
    exports.WatcherSwitcher = Object.freeze({
        get current() {
            return $watcher;
        },
        get watching() {
            return exports.watching;
        },
        enter: enterWatcher,
        exit: exitWatcher,
        pause: pauseWatching,
        resume: resumeWatching,
    });
});
//# sourceMappingURL=watcher-switcher.js.map