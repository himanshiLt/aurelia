import { Collection, ForOfStatement, IndexMap, LifecycleFlags as LF } from '@aurelia/runtime';
import { IRenderLocation } from '../../dom.js';
import { IViewFactory } from '../../templating/view.js';
import { IController } from '../../templating/controller.js';
import type { ISyntheticView, ICustomAttributeController, IHydratableController, ICustomAttributeViewModel, IHydratedController, IHydratedParentController, ControllerVisitor } from '../../templating/controller.js';
declare type Items<C extends Collection = unknown[]> = C | undefined;
export declare class Repeat<C extends Collection = unknown[]> implements ICustomAttributeViewModel {
    location: IRenderLocation;
    parent: IHydratableController;
    factory: IViewFactory;
    static inject: (import("@aurelia/kernel").InterfaceSymbol<IViewFactory> | import("@aurelia/kernel").InterfaceSymbol<IController<import("../../templating/controller.js").IViewModel>> | import("@aurelia/kernel").InterfaceSymbol<IRenderLocation<ChildNode>>)[];
    readonly id: number;
    private _observer?;
    views: ISyntheticView[];
    key?: string;
    forOf: ForOfStatement;
    local: string;
    readonly $controller: ICustomAttributeController<this>;
    items: Items<C>;
    private _innerItems;
    private _forOfBinding;
    private _observingInnerItems;
    private _reevaluating;
    private _innerItemsExpression;
    private _normalizedItems?;
    constructor(location: IRenderLocation, parent: IHydratableController, factory: IViewFactory);
    binding(initiator: IHydratedController, parent: IHydratedParentController, flags: LF): void | Promise<void>;
    attaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LF): void | Promise<void>;
    detaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LF): void | Promise<void>;
    itemsChanged(flags: LF): void;
    handleCollectionChange(indexMap: IndexMap | undefined, flags: LF): void;
    private _checkCollectionObserver;
    private _normalizeToArray;
    private _activateAllViews;
    private _deactivateAllViews;
    private _deactivateAndRemoveViewsByKey;
    private _createAndActivateAndSortViewsByKey;
    dispose(): void;
    accept(visitor: ControllerVisitor): void | true;
}
export {};
//# sourceMappingURL=repeat.d.ts.map