import { IPlatform } from '@aurelia/kernel';
import { bindingBehavior, BindingInterceptor } from '@aurelia/runtime';
export class DebounceBindingBehavior extends BindingInterceptor {
    constructor(binding, expr) {
        super(binding, expr);
        this.opts = { delay: 0 };
        this.firstArg = null;
        this.task = null;
        this.taskQueue = binding.locator.get(IPlatform).taskQueue;
        if (expr.args.length > 0) {
            this.firstArg = expr.args[0];
        }
    }
    callSource(args) {
        this.queueTask(() => this.binding.callSource(args));
        return void 0;
    }
    handleChange(newValue, previousValue, flags) {
        this.queueTask(() => this.binding.handleChange(newValue, previousValue, flags));
    }
    queueTask(callback) {
        // Queue the new one before canceling the old one, to prevent early yield
        const task = this.task;
        this.task = this.taskQueue.queueTask(() => {
            this.task = null;
            return callback();
        }, this.opts);
        task?.cancel();
    }
    $bind(flags, scope, hostScope) {
        if (this.firstArg !== null) {
            const delay = Number(this.firstArg.evaluate(flags, scope, hostScope, this.locator, null));
            if (!isNaN(delay)) {
                this.opts.delay = delay;
            }
        }
        this.binding.$bind(flags, scope, hostScope);
    }
    $unbind(flags) {
        this.task?.cancel();
        this.task = null;
        this.binding.$unbind(flags);
    }
}
bindingBehavior('debounce')(DebounceBindingBehavior);
//# sourceMappingURL=debounce.js.map