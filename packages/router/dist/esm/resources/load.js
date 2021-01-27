var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { customAttribute, bindable, BindingMode, IEventDelegator, IEventTarget, INode, CustomElement } from '@aurelia/runtime-html';
import { IRouter } from '../router.js';
import { IRouteContext } from '../route-context.js';
import { IRouterEvents } from '../router-events.js';
let LoadCustomAttribute = class LoadCustomAttribute {
    constructor(target, el, router, events, delegator, ctx) {
        this.target = target;
        this.el = el;
        this.router = router;
        this.events = events;
        this.delegator = delegator;
        this.ctx = ctx;
        this.attribute = 'href';
        this.active = false;
        this.href = null;
        this.instructions = null;
        this.eventListener = null;
        this.navigationEndListener = null;
        this.onClick = (e) => {
            if (this.instructions === null) {
                return;
            }
            // Ensure this is an ordinary left-button click.
            if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.button !== 0) {
                return;
            }
            e.preventDefault();
            // Floating promises from `Router#load` are ok because the router keeps track of state and handles the errors, etc.
            void this.router.load(this.instructions, { context: this.ctx });
        };
        // Ensure the element is not explicitly marked as external.
        this.isEnabled = !el.hasAttribute('external') && !el.hasAttribute('data-external');
    }
    binding() {
        if (this.isEnabled) {
            this.eventListener = this.delegator.addEventListener(this.target, this.el, 'click', this.onClick);
        }
        this.valueChanged();
        this.navigationEndListener = this.events.subscribe('au:router:navigation-end', _e => {
            this.valueChanged();
            this.active = this.instructions !== null && this.router.isActive(this.instructions, this.ctx);
        });
    }
    attaching() {
        if (this.ctx.allResolved !== null) {
            return this.ctx.allResolved.then(() => {
                this.valueChanged();
            });
        }
    }
    unbinding() {
        if (this.isEnabled) {
            this.eventListener.dispose();
        }
        this.navigationEndListener.dispose();
    }
    valueChanged() {
        if (this.route !== null && this.route !== void 0 && this.ctx.allResolved === null) {
            const def = this.ctx.childRoutes.find(x => x.id === this.route);
            if (def !== void 0) {
                // TODO(fkleuver): massive temporary hack. Will not work for siblings etc. Need to fix.
                const parentPath = this.ctx.node.computeAbsolutePath();
                // Note: This is very much preliminary just to fill the feature gap of v1's `generate`. It probably misses a few edge cases.
                // TODO(fkleuver): move this logic to RouteExpression and expose via public api, add tests etc
                let path = def.path[0];
                if (typeof this.params === 'object' && this.params !== null) {
                    const keys = Object.keys(this.params);
                    for (const key of keys) {
                        const value = this.params[key];
                        if (value != null && String(value).length > 0) {
                            path = path.replace(new RegExp(`[*:]${key}[?]?`), value);
                        }
                    }
                }
                // Remove leading and trailing optional param parts
                path = path.replace(/\/[*:][^/]+[?]/g, '').replace(/[*:][^/]+[?]\//g, '');
                if (parentPath) {
                    if (path) {
                        this.href = [parentPath, path].join('/');
                    }
                    else {
                        this.href = parentPath;
                    }
                }
                else {
                    this.href = path;
                }
                this.instructions = this.router.createViewportInstructions(path, { context: this.ctx });
            }
            else {
                if (typeof this.params === 'object' && this.params !== null) {
                    this.instructions = this.router.createViewportInstructions({ component: this.route, params: this.params }, { context: this.ctx });
                }
                else {
                    this.instructions = this.router.createViewportInstructions(this.route, { context: this.ctx });
                }
                this.href = this.instructions.toUrl();
            }
        }
        else {
            this.instructions = null;
            this.href = null;
        }
        const controller = CustomElement.for(this.el, { optional: true });
        if (controller !== null) {
            controller.viewModel[this.attribute] = this.instructions;
        }
        else {
            if (this.href === null) {
                this.el.removeAttribute(this.attribute);
            }
            else {
                this.el.setAttribute(this.attribute, this.href);
            }
        }
    }
};
__decorate([
    bindable({ mode: BindingMode.toView, primary: true, callback: 'valueChanged' })
], LoadCustomAttribute.prototype, "route", void 0);
__decorate([
    bindable({ mode: BindingMode.toView, callback: 'valueChanged' })
], LoadCustomAttribute.prototype, "params", void 0);
__decorate([
    bindable({ mode: BindingMode.toView })
], LoadCustomAttribute.prototype, "attribute", void 0);
__decorate([
    bindable({ mode: BindingMode.fromView })
], LoadCustomAttribute.prototype, "active", void 0);
LoadCustomAttribute = __decorate([
    customAttribute('load'),
    __param(0, IEventTarget),
    __param(1, INode),
    __param(2, IRouter),
    __param(3, IRouterEvents),
    __param(4, IEventDelegator),
    __param(5, IRouteContext)
], LoadCustomAttribute);
export { LoadCustomAttribute };
//# sourceMappingURL=load.js.map