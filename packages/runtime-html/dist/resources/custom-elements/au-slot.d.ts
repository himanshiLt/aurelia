import { IRenderLocation } from '../../dom.js';
import { IHydrationContext } from '../../templating/controller.js';
import type { LifecycleFlags } from '@aurelia/runtime';
import type { ControllerVisitor, ICustomElementController, ICustomElementViewModel, IHydratedController, IHydratedParentController, ISyntheticView } from '../../templating/controller.js';
import type { CustomElementDefinition } from '../custom-element.js';
import type { HydrateElementInstruction } from '../../renderer.js';
export declare type IProjections = Record<string, CustomElementDefinition>;
export declare const IProjections: import("@aurelia/kernel").InterfaceSymbol<Record<string, CustomElementDefinition<import("@aurelia/kernel").Constructable<{}>>>>;
export declare class AuSlot implements ICustomElementViewModel {
    private readonly hdrContext;
    readonly view: ISyntheticView;
    readonly $controller: ICustomElementController<this>;
    private hostScope;
    private outerScope;
    private readonly hasProjection;
    constructor(location: IRenderLocation, instruction: HydrateElementInstruction, hdrContext: IHydrationContext);
    binding(_initiator: IHydratedController, _parent: IHydratedParentController, _flags: LifecycleFlags): void | Promise<void>;
    attaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LifecycleFlags): void | Promise<void>;
    detaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LifecycleFlags): void | Promise<void>;
    dispose(): void;
    accept(visitor: ControllerVisitor): void | true;
}
export interface IAuSlotsInfo extends AuSlotsInfo {
}
export declare const IAuSlotsInfo: import("@aurelia/kernel").InterfaceSymbol<IAuSlotsInfo>;
export declare class AuSlotsInfo {
    readonly projectedSlots: string[];
    /**
     * @param {string[]} projectedSlots - Name of the slots to which content are projected.
     */
    constructor(projectedSlots: string[]);
}
//# sourceMappingURL=au-slot.d.ts.map