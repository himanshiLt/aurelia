import { INode, INodeSequence, IRenderLocation } from '../dom.js';
import { IInstruction, ICompliationInstruction } from '../renderer.js';
import { CustomElementDefinition } from '../resources/custom-element.js';
import { IViewFactory } from './view.js';
import { IAuSlotsInfo } from '../resources/custom-elements/au-slot.js';
import { IPlatform } from '../platform.js';
import { IController } from './controller.js';
import type { Constructable, IContainer, IFactory, IResolver, IResourceKind, Key, Resolved, ResourceDefinition, ResourceType, Transformer } from '@aurelia/kernel';
import type { LifecycleFlags } from '@aurelia/runtime';
import type { ICustomAttributeViewModel, IHydratableController } from './controller.js';
import type { HydrateAttributeInstruction, HydrateTemplateController, HydrateElementInstruction } from '../renderer.js';
import type { PartialCustomElementDefinition } from '../resources/custom-element.js';
export declare function isRenderContext(value: unknown): value is IRenderContext;
/**
 * A render context that wraps an `IContainer` and must be compiled before it can be used for composing.
 */
export interface IRenderContext extends IContainer {
    readonly platform: IPlatform;
    /**
     * The `CustomElementDefinition` that this `IRenderContext` was created with.
     *
     * If a `PartialCustomElementDefinition` was used to create this context, then this property will be the return value of `CustomElementDefinition.getOrCreate`.
     */
    readonly definition: CustomElementDefinition;
    /**
     * The `IContainer` (which may be, but is not guaranteed to be, an `IRenderContext`) that this `IRenderContext` was created with.
     */
    readonly parentContainer: IContainer;
    readonly container: IContainer;
    /**
     * Compiles the backing `CustomElementDefinition` (if needed) and returns the compiled `IRenderContext` that exposes the compiled `CustomElementDefinition` as well as composing operations.
     *
     * This operation is idempotent.
     *
     * @returns The compiled `IRenderContext`.
     */
    compile(compilationInstruction: ICompliationInstruction | null): ICompiledRenderContext;
    /**
     * Creates an (or returns the cached) `IViewFactory` that can be used to create synthetic view controllers.
     *
     * @returns Either a new `IViewFactory` (if this is the first call), or a cached one.
     */
    getViewFactory(name?: string): IViewFactory;
}
/**
 * A compiled `IRenderContext` that can create instances of `INodeSequence` (based on the template of the compiled definition)
 * and begin a component operation to create new component instances.
 */
export interface ICompiledRenderContext extends IRenderContext {
    /**
     * The compiled `CustomElementDefinition`.
     *
     * If the passed-in `PartialCustomElementDefinition` had a non-null `template` and `needsCompile` set to `true`, this will be a new definition created by the `ITemplateCompiler`.
     */
    readonly compiledDefinition: CustomElementDefinition;
    /**
     * Returns a new `INodeSequence` based on the document fragment from the compiled `CustomElementDefinition`.
     *
     * A new instance will be created from a clone of the fragment on each call.
     *
     * @returns An new instance of `INodeSequence` if there is a template, otherwise a shared empty instance.
     */
    createNodes(): INodeSequence;
    /**
     * Prepare a new container to associate with a custom element instance
     */
    createElementContainer(parentController: IController, host: HTMLElement, instruction: HydrateElementInstruction, viewFactory?: IViewFactory, location?: IRenderLocation, auSlotsInfo?: IAuSlotsInfo): IContainer;
    /**
     * Instantiate a custom attribute
     */
    invokeAttribute(parentController: IController, host: HTMLElement, instruction: HydrateAttributeInstruction | HydrateTemplateController, viewFactory?: IViewFactory, location?: IRenderLocation, auSlotsInfo?: IAuSlotsInfo): ICustomAttributeViewModel;
    render(flags: LifecycleFlags, controller: IController, targets: ArrayLike<INode>, templateDefinition: CustomElementDefinition, host: INode | null | undefined): void;
    renderChildren(flags: LifecycleFlags, instructions: readonly IInstruction[], controller: IController, target: unknown): void;
}
export declare function getRenderContext(partialDefinition: PartialCustomElementDefinition, container: IContainer): IRenderContext;
export declare namespace getRenderContext {
    var count: number;
}
export declare class RenderContext implements ICompiledRenderContext {
    readonly definition: CustomElementDefinition;
    readonly parentContainer: IContainer;
    get id(): number;
    readonly root: IContainer;
    readonly container: IContainer;
    private readonly parentControllerProvider;
    private readonly elementProvider;
    private readonly instructionProvider;
    private readonly factoryProvider;
    private readonly renderLocationProvider;
    private readonly auSlotsInfoProvider;
    private fragment;
    private factory;
    private isCompiled;
    readonly platform: IPlatform;
    private readonly renderers;
    compiledDefinition: CustomElementDefinition;
    constructor(definition: CustomElementDefinition, parentContainer: IContainer);
    has<K extends Key>(key: K | Key, searchAncestors: boolean): boolean;
    get<K extends Key>(key: K | Key): Resolved<K>;
    getAll<K extends Key>(key: K | Key): readonly Resolved<K>[];
    register(...params: unknown[]): IContainer;
    registerResolver<K extends Key, T = K>(key: K, resolver: IResolver<T>): IResolver<T>;
    registerTransformer<K extends Key, T = K>(key: K, transformer: Transformer<T>): boolean;
    getResolver<K extends Key, T = K>(key: K | Key, autoRegister?: boolean): IResolver<T> | null;
    invoke<T, TDeps extends unknown[] = unknown[]>(key: Constructable<T>, dynamicDependencies?: TDeps): T;
    getFactory<T extends Constructable>(key: T): IFactory<T>;
    registerFactory<K extends Constructable>(key: K, factory: IFactory<K>): void;
    createChild(): IContainer;
    find<TType extends ResourceType, TDef extends ResourceDefinition>(kind: IResourceKind<TType, TDef>, name: string): TDef | null;
    create<TType extends ResourceType, TDef extends ResourceDefinition>(kind: IResourceKind<TType, TDef>, name: string): InstanceType<TType> | null;
    disposeResolvers(): void;
    compile(compilationInstruction: ICompliationInstruction | null): ICompiledRenderContext;
    getViewFactory(name?: string): IViewFactory;
    createNodes(): INodeSequence;
    createElementContainer(parentController: IController, host: HTMLElement, instruction: HydrateElementInstruction, viewFactory?: IViewFactory, location?: IRenderLocation, auSlotsInfo?: IAuSlotsInfo): IContainer;
    resourceInvoker: IContainer | null;
    invokeAttribute(parentController: IController, host: HTMLElement, instruction: HydrateAttributeInstruction | HydrateTemplateController, viewFactory?: IViewFactory, location?: IRenderLocation, auSlotsInfo?: IAuSlotsInfo): ICustomAttributeViewModel;
    render(flags: LifecycleFlags, controller: IHydratableController, targets: ArrayLike<INode>, definition: CustomElementDefinition, host: INode | null | undefined): void;
    renderChildren(flags: LifecycleFlags, instructions: readonly IInstruction[], controller: IHydratableController, target: unknown): void;
    dispose(): void;
}
//# sourceMappingURL=render-context.d.ts.map