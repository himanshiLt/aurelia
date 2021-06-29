"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderContext = exports.getRenderContext = exports.isRenderContext = void 0;
const kernel_1 = require("@aurelia/kernel");
const dom_js_1 = require("../dom.js");
const renderer_js_1 = require("../renderer.js");
const custom_element_js_1 = require("../resources/custom-element.js");
const custom_attribute_js_1 = require("../resources/custom-attribute.js");
const view_js_1 = require("./view.js");
const au_slot_js_1 = require("../resources/custom-elements/au-slot.js");
const platform_js_1 = require("../platform.js");
const controller_js_1 = require("./controller.js");
const definitionContainerLookup = new WeakMap();
const fragmentCache = new WeakMap();
function isRenderContext(value) {
    return value instanceof RenderContext;
}
exports.isRenderContext = isRenderContext;
let renderContextCount = 0;
function getRenderContext(partialDefinition, container) {
    const definition = custom_element_js_1.CustomElementDefinition.getOrCreate(partialDefinition);
    // injectable completely prevents caching, ensuring that each instance gets a new context context
    if (definition.injectable !== null) {
        return new RenderContext(definition, container);
    }
    let containerLookup = definitionContainerLookup.get(definition);
    if (containerLookup === void 0) {
        definitionContainerLookup.set(definition, containerLookup = new WeakMap());
    }
    let context = containerLookup.get(container);
    if (context === void 0) {
        containerLookup.set(container, context = new RenderContext(definition, container));
    }
    return context;
}
exports.getRenderContext = getRenderContext;
getRenderContext.count = 0;
// A simple counter for debugging purposes only
Reflect.defineProperty(getRenderContext, 'count', {
    get: () => renderContextCount
});
const emptyNodeCache = new WeakMap();
class RenderContext {
    constructor(definition, parentContainer) {
        this.definition = definition;
        this.parentContainer = parentContainer;
        this.fragment = null;
        this.factory = void 0;
        this.isCompiled = false;
        this.renderers = Object.create(null);
        this.compiledDefinition = (void 0);
        this.resourceInvoker = null;
        ++renderContextCount;
        const container = this.container = parentContainer;
        // TODO(fkleuver): get contextual + root renderers
        const renderers = container.getAll(renderer_js_1.IRenderer);
        let i = 0;
        let renderer;
        for (; i < renderers.length; ++i) {
            renderer = renderers[i];
            this.renderers[renderer.instructionType] = renderer;
        }
        this.root = parentContainer.root;
        this.platform = container.get(platform_js_1.IPlatform);
        this.elementProvider = new kernel_1.InstanceProvider('ElementResolver');
        this.factoryProvider = new ViewFactoryProvider();
        this.parentControllerProvider = new kernel_1.InstanceProvider('IController');
        this.instructionProvider = new kernel_1.InstanceProvider('IInstruction');
        this.renderLocationProvider = new kernel_1.InstanceProvider('IRenderLocation');
        this.auSlotsInfoProvider = new kernel_1.InstanceProvider('IAuSlotsInfo');
    }
    get id() {
        return this.container.id;
    }
    // #region IServiceLocator api
    has(key, searchAncestors) {
        return this.container.has(key, searchAncestors);
    }
    get(key) {
        return this.container.get(key);
    }
    getAll(key) {
        return this.container.getAll(key);
    }
    // #endregion
    // #region IContainer api
    register(...params) {
        return this.container.register(...params);
    }
    registerResolver(key, resolver) {
        return this.container.registerResolver(key, resolver);
    }
    // public deregisterResolverFor<K extends Key, T = K>(key: K): void {
    //   this.container.deregisterResolverFor(key);
    // }
    registerTransformer(key, transformer) {
        return this.container.registerTransformer(key, transformer);
    }
    getResolver(key, autoRegister) {
        return this.container.getResolver(key, autoRegister);
    }
    invoke(key, dynamicDependencies) {
        return this.container.invoke(key, dynamicDependencies);
    }
    getFactory(key) {
        return this.container.getFactory(key);
    }
    registerFactory(key, factory) {
        this.container.registerFactory(key, factory);
    }
    createChild() {
        return this.container.createChild();
    }
    find(kind, name) {
        return this.container.find(kind, name);
    }
    create(kind, name) {
        return this.container.create(kind, name);
    }
    disposeResolvers() {
        this.container.disposeResolvers();
    }
    // #endregion
    // #region IRenderContext api
    compile(compilationInstruction) {
        let compiledDefinition;
        if (this.isCompiled) {
            return this;
        }
        this.isCompiled = true;
        const definition = this.definition;
        if (definition.needsCompile) {
            const container = this.container;
            const compiler = container.get(renderer_js_1.ITemplateCompiler);
            compiledDefinition = this.compiledDefinition = compiler.compile(definition, container, compilationInstruction);
        }
        else {
            compiledDefinition = this.compiledDefinition = definition;
        }
        // Support Recursive Components by adding self to own context
        compiledDefinition.register(this);
        if (fragmentCache.has(compiledDefinition)) {
            this.fragment = fragmentCache.get(compiledDefinition);
        }
        else {
            const doc = this.platform.document;
            const template = compiledDefinition.template;
            if (template === null || this.definition.enhance === true) {
                this.fragment = null;
            }
            else if (template instanceof this.platform.Node) {
                if (template.nodeName === 'TEMPLATE') {
                    this.fragment = doc.adoptNode(template.content);
                }
                else {
                    (this.fragment = doc.adoptNode(doc.createDocumentFragment())).appendChild(template);
                }
            }
            else {
                const tpl = doc.createElement('template');
                doc.adoptNode(tpl.content);
                if (typeof template === 'string') {
                    tpl.innerHTML = template;
                }
                this.fragment = tpl.content;
            }
            fragmentCache.set(compiledDefinition, this.fragment);
        }
        return this;
    }
    getViewFactory(name) {
        let factory = this.factory;
        if (factory === void 0) {
            if (name === void 0) {
                name = this.definition.name;
            }
            factory = this.factory = new view_js_1.ViewFactory(name, this);
        }
        return factory;
    }
    // #endregion
    // #region ICompiledRenderContext api
    createNodes() {
        if (this.compiledDefinition.enhance === true) {
            return new dom_js_1.FragmentNodeSequence(this.platform, this.compiledDefinition.template);
        }
        if (this.fragment === null) {
            let emptyNodes = emptyNodeCache.get(this.platform);
            if (emptyNodes === void 0) {
                emptyNodeCache.set(this.platform, emptyNodes = new dom_js_1.FragmentNodeSequence(this.platform, this.platform.document.createDocumentFragment()));
            }
            return emptyNodes;
        }
        return new dom_js_1.FragmentNodeSequence(this.platform, this.fragment.cloneNode(true));
    }
    // #endregion
    createElementContainer(parentController, host, instruction, viewFactory, location, auSlotsInfo) {
        const p = this.platform;
        const container = this.container.createChild();
        const nodeProvider = new kernel_1.InstanceProvider('ElementProvider', host);
        // todo:
        // both node provider and location provider may not be allowed to throw
        // if there's no value associated, unlike InstanceProvider
        // reason being some custom element can have `containerless` attribute on them
        // causing the host to disappear, and replace by a location instead
        container.registerResolver(dom_js_1.INode, nodeProvider);
        container.registerResolver(p.Node, nodeProvider);
        container.registerResolver(p.Element, nodeProvider);
        container.registerResolver(p.HTMLElement, nodeProvider);
        container.registerResolver(controller_js_1.IController, new kernel_1.InstanceProvider('IController', parentController));
        container.registerResolver(renderer_js_1.IInstruction, new kernel_1.InstanceProvider('IInstruction', instruction));
        container.registerResolver(dom_js_1.IRenderLocation, location == null
            ? noLocationProvider
            : new kernel_1.InstanceProvider('IRenderLocation', location));
        container.registerResolver(view_js_1.IViewFactory, viewFactory == null
            ? noViewFactoryProvider
            : new ViewFactoryProvider(viewFactory));
        container.registerResolver(au_slot_js_1.IAuSlotsInfo, auSlotsInfo == null
            ? noAuSlotProvider
            : new kernel_1.InstanceProvider('AuSlotInfo', auSlotsInfo));
        return container;
    }
    invokeAttribute(parentController, host, instruction, viewFactory, location, auSlotsInfo) {
        const p = this.platform;
        const eProvider = this.elementProvider;
        const pcProvider = this.parentControllerProvider;
        const iProvider = this.instructionProvider;
        const fProvider = this.factoryProvider;
        const rlProvider = this.renderLocationProvider;
        const siProvider = this.auSlotsInfoProvider;
        const container = this.container;
        const definition = container.find(custom_attribute_js_1.CustomAttribute, instruction.res);
        const Ctor = definition.Type;
        let invoker = this.resourceInvoker;
        if (invoker == null) {
            invoker = container.createChild();
            invoker.registerResolver(dom_js_1.INode, eProvider, true);
            invoker.registerResolver(p.Node, eProvider);
            invoker.registerResolver(p.Element, eProvider);
            invoker.registerResolver(p.HTMLElement, eProvider);
            invoker.registerResolver(controller_js_1.IController, pcProvider, true);
            invoker.registerResolver(renderer_js_1.IInstruction, iProvider, true);
            invoker.registerResolver(dom_js_1.IRenderLocation, rlProvider, true);
            invoker.registerResolver(view_js_1.IViewFactory, fProvider, true);
            invoker.registerResolver(au_slot_js_1.IAuSlotsInfo, siProvider, true);
        }
        eProvider.prepare(host);
        pcProvider.prepare(parentController);
        iProvider.prepare(instruction);
        // null or undefined wouldn't matter
        // as it can just throw if trying to inject something non-existant
        fProvider.prepare(viewFactory);
        rlProvider.prepare(location);
        siProvider.prepare(auSlotsInfo);
        const instance = invoker.invoke(Ctor);
        invoker.dispose();
        return instance;
    }
    // public create
    // #region IComponentFactory api
    render(flags, controller, targets, definition, host) {
        if (targets.length !== definition.instructions.length) {
            throw new Error(`The compiled template is not aligned with the render instructions. There are ${targets.length} targets and ${definition.instructions.length} instructions.`);
        }
        for (let i = 0; i < targets.length; ++i) {
            this.renderChildren(
            /* flags        */ flags, 
            /* instructions */ definition.instructions[i], 
            /* controller   */ controller, 
            /* target       */ targets[i]);
        }
        if (host !== void 0 && host !== null) {
            this.renderChildren(
            /* flags        */ flags, 
            /* instructions */ definition.surrogates, 
            /* controller   */ controller, 
            /* target       */ host);
        }
    }
    renderChildren(flags, instructions, controller, target) {
        for (let i = 0; i < instructions.length; ++i) {
            const current = instructions[i];
            this.renderers[current.type].render(flags, this, controller, target, current);
        }
    }
    dispose() {
        throw new Error('Cannot dispose a render context');
    }
}
exports.RenderContext = RenderContext;
class ViewFactoryProvider {
    constructor(
    /**
     * The factory instance that this provider will resolves to,
     * until explicitly overridden by prepare call
     */
    factory) {
        this.factory = null;
        if (factory !== void 0) {
            this.factory = factory;
        }
    }
    prepare(factory) {
        this.factory = factory;
    }
    get $isResolver() { return true; }
    resolve() {
        const factory = this.factory;
        if (factory === null) {
            throw new Error('Cannot resolve ViewFactory before the provider was prepared.');
        }
        if (typeof factory.name !== 'string' || factory.name.length === 0) {
            throw new Error('Cannot resolve ViewFactory without a (valid) name.');
        }
        return factory;
    }
    dispose() {
        this.factory = null;
    }
}
const noLocationProvider = new kernel_1.InstanceProvider('IRenderLocation');
const noViewFactoryProvider = new ViewFactoryProvider();
const noAuSlotProvider = new kernel_1.InstanceProvider('AuSlotsInfo');
//# sourceMappingURL=render-context.js.map