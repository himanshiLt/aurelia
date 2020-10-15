var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ILogger, nextId, onResolve, resolveAll, } from '@aurelia/kernel';
import { IRenderLocation, } from '../../dom';
import { BindingMode, } from '../../flags';
import { IViewFactory, } from '../../lifecycle';
import { IObserverLocator, } from '../../observation/observer-locator';
import { bindable, } from '../../templating/bindable';
import { templateController, } from '../custom-attribute';
let Switch = class Switch {
    constructor(factory, location) {
        this.factory = factory;
        this.location = location;
        this.id = nextId('au$component');
        /** @internal */
        this.cases = [];
        this.activeCases = [];
        /**
         * This is kept around here so that changes can be awaited from the tests.
         * This needs to be removed after the scheduler is ready to handle/queue the floating promises.
         */
        this.promise = void 0;
    }
    link(flags, parentContext, controller, childController, target, instruction) {
        const view = this.view = this.factory.create(flags, this.$controller);
        view.setLocation(this.location, 1 /* insertBefore */);
    }
    afterAttach(initiator, parent, flags) {
        const view = this.view;
        const $controller = this.$controller;
        this.queue(() => view.activate(view, $controller, flags, $controller.scope, $controller.hostScope));
        this.queue(() => this.swap(flags, this.value));
        return this.promise;
    }
    afterUnbind(initiator, parent, flags) {
        this.queue(() => {
            const view = this.view;
            return view.deactivate(view, this.$controller, flags);
        });
        return this.promise;
    }
    dispose() {
        var _a;
        (_a = this.view) === null || _a === void 0 ? void 0 : _a.dispose();
        this.view = (void 0);
    }
    valueChanged(_newValue, _oldValue, flags) {
        if (!this.$controller.isActive) {
            return;
        }
        this.queue(() => this.swap(flags, this.value));
    }
    caseChanged($case, flags) {
        this.queue(() => this.handleCaseChange($case, flags));
    }
    async handleCaseChange($case, flags) {
        const isMatch = $case.isMatch(this.value, flags);
        const activeCases = this.activeCases;
        const numActiveCases = activeCases.length;
        // Early termination #1
        if (!isMatch) {
            /** The previous match started with this; thus clear. */
            if (numActiveCases > 0 && activeCases[0].id === $case.id) {
                await this.clearActiveCases(flags);
            }
            /**
             * There are 2 different scenarios here:
             * 1. $case in activeCases: Indicates by-product of fallthrough. The starting case still satisfies. Return.
             * 2. $case not in activeCases: It was previously not active, and currently also not a match. Return.
             */
            return;
        }
        // Early termination #2
        if (numActiveCases > 0 && activeCases[0].id < $case.id) {
            // Even if this case now a match, the previous case still wins by as that has lower ordinal.
            return;
        }
        // compute the new active cases
        const newActiveCases = [];
        let fallThrough = $case.fallThrough;
        if (!fallThrough) {
            newActiveCases.push($case);
        }
        else {
            const cases = this.cases;
            const idx = cases.indexOf($case);
            for (let i = idx, ii = cases.length; i < ii && fallThrough; i++) {
                const c = cases[i];
                newActiveCases.push(c);
                fallThrough = c.fallThrough;
            }
        }
        await this.clearActiveCases(flags, newActiveCases);
        this.activeCases = newActiveCases;
        await this.activateCases(flags);
    }
    swap(flags, value) {
        const newActiveCases = [];
        let fallThrough = false;
        for (const $case of this.cases) {
            if (fallThrough || $case.isMatch(value, flags)) {
                newActiveCases.push($case);
                fallThrough = $case.fallThrough;
            }
            if (newActiveCases.length > 0 && !fallThrough) {
                break;
            }
        }
        const defaultCase = this.defaultCase;
        if (newActiveCases.length === 0 && defaultCase !== void 0) {
            newActiveCases.push(defaultCase);
        }
        return onResolve(this.activeCases.length > 0
            ? this.clearActiveCases(flags, newActiveCases)
            : void 0, () => {
            this.activeCases = newActiveCases;
            if (newActiveCases.length === 0) {
                return;
            }
            return this.activateCases(flags);
        });
    }
    activateCases(flags) {
        const controller = this.$controller;
        if (!controller.isActive) {
            return;
        }
        const cases = this.activeCases;
        const length = cases.length;
        if (length === 0) {
            return;
        }
        const scope = controller.scope;
        const hostScope = controller.hostScope;
        // most common case
        if (length === 1) {
            return cases[0].activate(flags, scope, hostScope);
        }
        return resolveAll(...cases.map(($case) => $case.activate(flags, scope, hostScope)));
    }
    clearActiveCases(flags, newActiveCases = []) {
        const cases = this.activeCases;
        const numCases = cases.length;
        if (numCases === 0) {
            return;
        }
        if (numCases === 1) {
            const firstCase = cases[0];
            if (!newActiveCases.includes(firstCase)) {
                cases.length = 0;
                return firstCase.deactivate(flags);
            }
            return;
        }
        return onResolve(resolveAll(...cases.reduce((acc, $case) => {
            if (!newActiveCases.includes($case)) {
                acc.push($case.deactivate(flags));
            }
            return acc;
        }, [])), () => {
            cases.length = 0;
        });
    }
    queue(action) {
        const previousPromise = this.promise;
        let promise = void 0;
        promise = this.promise = onResolve(onResolve(previousPromise, action), () => {
            if (this.promise === promise) {
                this.promise = void 0;
            }
        });
    }
};
__decorate([
    bindable,
    __metadata("design:type", Object)
], Switch.prototype, "value", void 0);
Switch = __decorate([
    templateController('switch'),
    __param(0, IViewFactory),
    __param(1, IRenderLocation),
    __metadata("design:paramtypes", [Object, Object])
], Switch);
export { Switch };
let Case = class Case {
    constructor(factory, locator, location, logger) {
        this.factory = factory;
        this.locator = locator;
        this.id = nextId('au$component');
        this.fallThrough = false;
        this.debug = logger.config.level <= 1 /* debug */;
        this.logger = logger.scopeTo(`${this.constructor.name}-#${this.id}`);
        (this.view = this.factory.create()).setLocation(location, 1 /* insertBefore */);
    }
    link(flags, parentContext, controller, _childController, _target, _instruction) {
        const switchController = controller.parent;
        const $switch = switchController === null || switchController === void 0 ? void 0 : switchController.viewModel;
        if ($switch instanceof Switch) {
            this.$switch = $switch;
            this.linkToSwitch($switch);
        }
        else {
            throw new Error('The parent switch not found; only `*[switch] > *[case|default-case]` relation is supported.');
        }
    }
    afterUnbind(initiator, parent, flags) {
        return this.deactivate(flags);
    }
    isMatch(value, flags) {
        if (this.debug) {
            this.logger.debug('isMatch()');
        }
        const $value = this.value;
        if (Array.isArray($value)) {
            if (this.observer === void 0) {
                this.observer = this.observeCollection(flags, $value);
            }
            return $value.includes(value);
        }
        return $value === value;
    }
    valueChanged(newValue, _oldValue, flags) {
        var _a;
        if (Array.isArray(newValue)) {
            (_a = this.observer) === null || _a === void 0 ? void 0 : _a.removeCollectionSubscriber(this);
            this.observer = this.observeCollection(flags, newValue);
        }
        else if (this.observer !== void 0) {
            this.observer.removeCollectionSubscriber(this);
        }
        this.$switch.caseChanged(this, flags);
    }
    handleCollectionChange(_indexMap, flags) {
        this.$switch.caseChanged(this, flags);
    }
    activate(flags, scope, hostScope) {
        const view = this.view;
        if (view.isActive) {
            return;
        }
        return view.activate(view, this.$controller, flags, scope, hostScope);
    }
    deactivate(flags) {
        const view = this.view;
        if (!view.isActive) {
            return;
        }
        return view.deactivate(view, this.$controller, flags);
    }
    dispose() {
        var _a, _b;
        (_a = this.observer) === null || _a === void 0 ? void 0 : _a.removeCollectionSubscriber(this);
        (_b = this.view) === null || _b === void 0 ? void 0 : _b.dispose();
        this.view = (void 0);
    }
    linkToSwitch(auSwitch) {
        auSwitch.cases.push(this);
    }
    observeCollection(flags, $value) {
        const observer = this.locator.getArrayObserver(flags, $value);
        observer.addCollectionSubscriber(this);
        return observer;
    }
};
__decorate([
    bindable,
    __metadata("design:type", Object)
], Case.prototype, "value", void 0);
__decorate([
    bindable({
        set: v => {
            switch (v) {
                case 'true': return true;
                case 'false': return false;
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                default: return !!v;
            }
        },
        mode: BindingMode.oneTime
    }),
    __metadata("design:type", Boolean)
], Case.prototype, "fallThrough", void 0);
Case = __decorate([
    templateController('case'),
    __param(0, IViewFactory),
    __param(1, IObserverLocator),
    __param(2, IRenderLocation),
    __param(3, ILogger),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], Case);
export { Case };
let DefaultCase = class DefaultCase extends Case {
    linkToSwitch($switch) {
        if ($switch.defaultCase !== void 0) {
            throw new Error('Multiple \'default-case\'s are not allowed.');
        }
        $switch.defaultCase = this;
    }
};
DefaultCase = __decorate([
    templateController('default-case')
], DefaultCase);
export { DefaultCase };
//# sourceMappingURL=switch.js.map