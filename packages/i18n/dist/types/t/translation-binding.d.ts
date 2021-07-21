import { LifecycleFlags, IPlatform } from '@aurelia/runtime-html';
import i18next from 'i18next';
import type { IContainer, IServiceLocator } from '@aurelia/kernel';
import { Scope, IsExpression, IConnectableBinding, IExpressionParser, IObserverLocator, IPartialConnectableBinding } from '@aurelia/runtime';
import type { CallBindingInstruction, IHydratableController, INode } from '@aurelia/runtime-html';
interface TranslationBindingCreationContext {
    parser: IExpressionParser;
    observerLocator: IObserverLocator;
    context: IContainer;
    controller: IHydratableController;
    target: HTMLElement;
    instruction: CallBindingInstruction;
    platform: IPlatform;
    isParameterContext?: boolean;
}
export interface TranslationBinding extends IConnectableBinding {
}
export declare class TranslationBinding implements IPartialConnectableBinding {
    observerLocator: IObserverLocator;
    locator: IServiceLocator;
    interceptor: this;
    isBound: boolean;
    expr: IsExpression;
    private readonly i18n;
    private readonly _contentAttributes;
    private _keyExpression;
    private scope;
    private task;
    private _isInterpolation;
    private readonly _targetAccessors;
    target: HTMLElement;
    private readonly platform;
    private parameter;
    constructor(target: INode, observerLocator: IObserverLocator, locator: IServiceLocator, platform: IPlatform);
    static create({ parser, observerLocator, context, controller, target, instruction, platform, isParameterContext, }: TranslationBindingCreationContext): void;
    private static getBinding;
    $bind(flags: LifecycleFlags, scope: Scope): void;
    $unbind(flags: LifecycleFlags): void;
    handleChange(newValue: string | i18next.TOptions, _previousValue: string | i18next.TOptions, flags: LifecycleFlags): void;
    handleLocaleChange(): void;
    useParameter(expr: IsExpression): void;
    private updateTranslations;
    private _preprocessAttributes;
    private _isContentAttribute;
    private _updateContent;
    private _prepareTemplate;
    private addContentToTemplate;
    private _ensureKeyExpression;
}
export {};
//# sourceMappingURL=translation-binding.d.ts.map