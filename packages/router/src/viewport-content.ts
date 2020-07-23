/* eslint-disable no-fallthrough */
import { IContainer } from '@aurelia/kernel';
import { Controller, LifecycleFlags, ILifecycle, IHydratedController, ICustomElementController, ICustomElementViewModel } from '@aurelia/runtime';
import { IRouteableComponent, RouteableComponentType, ReentryBehavior, NavigationInstruction } from './interfaces';
import { parseQuery } from './parser';
import { Viewport } from './viewport';
import { ViewportInstruction } from './viewport-instruction';
import { Navigation } from './navigation';
import { IConnectionCustomElement } from './resources/viewport';
import { Runner } from './runner';

/**
 * @internal - Shouldn't be used directly
 */
export const enum ContentStatus {
  none = 0,
  created = 1,
  activated = 3,
}

export type ContentState = 'created' | 'activated' | 'entered';

/**
 * @internal - Shouldn't be used directly
 */
export class ViewportContent {
  // public contentStatus: ContentStatus = ContentStatus.none;
  public contentStates: Set<ContentState> = new Set();
  public entered: boolean = false;
  public fromCache: boolean = false;
  public fromHistory: boolean = false;
  public reentry: boolean = false;

  public constructor(
    // Can (and wants) be a (resolved) type or a string (to be resolved later)
    public content: ViewportInstruction = new ViewportInstruction(''),
    public instruction = new Navigation({
      instruction: '',
      fullStateInstruction: '',
    }),
    connectionCE: IConnectionCustomElement | null = null
  ) {
    // If we've got a container, we're good to resolve type
    if (!this.content.isComponentType() && (connectionCE?.container ?? null) !== null) {
      this.content.componentType = this.toComponentType(connectionCE!.container!);
    }
  }

  public get componentInstance(): IRouteableComponent | null {
    return this.content.componentInstance;
  }
  public get viewport(): Viewport | null {
    return this.content.viewport;
  }

  public equalComponent(other: ViewportContent): boolean {
    return this.content.sameComponent(other.content);
  }

  public equalParameters(other: ViewportContent): boolean {
    return this.content.sameComponent(other.content, true) &&
      // TODO: Review whether query is relevant
      this.instruction.query === other.instruction.query;
  }

  public reentryBehavior(): ReentryBehavior {
    return (this.content.componentInstance !== null &&
      'reentryBehavior' in this.content.componentInstance &&
      this.content.componentInstance.reentryBehavior !== void 0)
      ? this.content.componentInstance.reentryBehavior
      : ReentryBehavior.default;
  }

  public isCacheEqual(other: ViewportContent): boolean {
    return this.content.sameComponent(other.content, true);
  }

  public contentController(connectionCE: IConnectionCustomElement): ICustomElementController<Element, ICustomElementViewModel<Element>> {
    return Controller.forCustomElement(
      this.content.componentInstance as ICustomElementViewModel<Element>,
      connectionCE.container.get(ILifecycle),
      connectionCE.element,
      connectionCE.container,
      void 0,
      void 0,
    );
  }

  public createComponent(connectionCE: IConnectionCustomElement, fallback?: string): void {
    // if (this.contentStatus !== ContentStatus.none) {
    if (this.contentStates.has('created')) {
      return;
    }
    // Don't load cached content or instantiated history content
    if (!this.fromCache && !this.fromHistory) {
      try {
        this.content.componentInstance = this.toComponentInstance(connectionCE.container);
      } catch (e) {
        if (fallback !== void 0) {
          this.content.setParameters({ id: this.content.componentName });
          this.content.setComponent(fallback);
          try {
            this.content.componentInstance = this.toComponentInstance(connectionCE.container);
          } catch (ee) {
            throw e;
          }
        } else {
          throw e;
        }
      }
    }
    this.contentStates.add('created');
    // this.contentStatus = ContentStatus.created;

    // if (this.contentStatus !== ContentStatus.created || !this.entered || !this.content.componentInstance) {
    // if (this.contentStatus !== ContentStatus.created || this.entered || !this.content.componentInstance) {
    if (this.contentStates.has('entered') || !this.content.componentInstance) {
      return;
    }
    // this.contentStatus = ContentStatus.loaded;
    // Don't load cached content or instantiated history content
    if (!this.fromCache || !this.fromHistory) {
      const controller = this.contentController(connectionCE);
      controller.parent = connectionCE.controller; // CustomElement.for(connectionCE.element)!;
    }
  }

  public destroyComponent(): void {
    // TODO: We might want to do something here eventually, who knows?
    // if (this.contentStatus !== ContentStatus.created) {
    if (!this.contentStates.has('created')) {
      return;
    }
    // Don't destroy components when stateful
    // this.contentStatus = ContentStatus.none;
    this.contentStates.delete('created');
  }

  public canEnter(viewport: Viewport, previousInstruction: Navigation): boolean | NavigationInstruction | NavigationInstruction[] | Promise<boolean | NavigationInstruction | NavigationInstruction[]> {
    if (!this.content.componentInstance) {
      return false;
    }

    if (!this.content.componentInstance.canEnter) {
      return true;
    }

    const typeParameters = this.content.componentType ? this.content.componentType.parameters : null;
    this.instruction.parameters = this.content.toSpecifiedParameters(typeParameters);
    const merged = { ...parseQuery(this.instruction.query), ...this.instruction.parameters };
    const result = this.content.componentInstance.canEnter(merged, this.instruction, previousInstruction);
    if (typeof result === 'boolean') {
      return result;
    }
    if (typeof result === 'string') {
      return [viewport.router.createViewportInstruction(result, viewport)];
    }
    return result as Promise<ViewportInstruction[]>;
  }

  public canLeave(nextInstruction: Navigation | null): boolean | Promise<boolean> {
    if (!this.content.componentInstance || !this.content.componentInstance.canLeave) {
      return true;
    }

    return this.content.componentInstance.canLeave(nextInstruction, this.instruction);
  }
  // public async canLeave(nextInstruction: Navigation | null): Promise<boolean> {
  //   if (!this.content.componentInstance || !this.content.componentInstance.canLeave) {
  //     return true;
  //   }

  //   const result = this.content.componentInstance.canLeave(nextInstruction, this.instruction);

  //   if (typeof result === 'boolean') {
  //     return result;
  //   }
  //   return result;
  // }

  public enter(previousInstruction: Navigation): void | Promise<void> {
    // if (!this.reentry && (this.contentStatus !== ContentStatus.created || this.entered)) {
    // if (!this.reentry && this.entered) {
    if (!this.contentStates.has('created') || (this.contentStates.has('entered') && !this.reentry)) {
      return;
    }
    // this.entered = true;
    this.contentStates.add('entered');
    if (this.content.componentInstance && this.content.componentInstance.enter) {
      const typeParameters = this.content.componentType ? this.content.componentType.parameters : null;
      this.instruction.parameters = this.content.toSpecifiedParameters(typeParameters);
      const merged = { ...parseQuery(this.instruction.query), ...this.instruction.parameters };
      return this.content.componentInstance.enter(merged, this.instruction, previousInstruction);
    }
  }
  public leave(nextInstruction: Navigation | null): void | Promise<void> {
    // if (!this.entered) {
    if (!this.contentStates.has('entered')) {
      return;
    }
    // this.entered = false;
    this.contentStates.delete('entered');
    if (this.content.componentInstance && this.content.componentInstance.leave) {
      return this.content.componentInstance.leave(nextInstruction, this.instruction);
    }
  }

  public unloadComponent(cache: ViewportContent[], stateful: boolean = false): void {
    // TODO: We might want to do something here eventually, who knows?
    // if (this.contentStatus !== ContentStatus.activated) {
    if (!this.contentStates.has('created')) {
      return;
    }

    // Don't unload components when stateful
    // TODO: We're missing stuff here
    if (!stateful) {
      // this.contentStatus = ContentStatus.created;
      this.contentStates.delete('created');
    } else {
      cache.push(this);
    }
  }

  public activateComponent(initiator: IHydratedController<Element> | null, parent: ICustomElementController<Element, ICustomElementViewModel<Element>> | null, flags: LifecycleFlags, connectionCE: IConnectionCustomElement): void | Promise<void> {
    if (this.contentStates.has('activated') || !this.contentStates.has('created')) {
      return;
    }
    this.contentStates.add('activated');

    const contentController = this.contentController(connectionCE);
    return Runner.run(
      () => contentController.activate(initiator ?? contentController, parent!, flags),
      () => {
        if (this.fromCache || this.fromHistory) {
          const elements = Array.from(connectionCE.element.getElementsByTagName('*'));
          for (const el of elements) {
            const attr = el.getAttribute('au-element-scroll');
            if (attr) {
              const [top, left] = attr.split(',');
              el.removeAttribute('au-element-scroll');
              el.scrollTo(+left, +top);
            }
          }
        }
      },
    );
  }
  // public async activateComponent(initiator: IHydratedController<Element> | null, parent: ICustomElementController<Element, ICustomElementViewModel<Element>> | null, flags: LifecycleFlags, connectionCE: IConnectionCustomElement): Promise<void> {
  //   // if (this.contentStatus !== ContentStatus.created) {
  //   if (!this.contentStates.has('created')) {
  //     return;
  //   }
  //   // this.contentStatus = ContentStatus.activated;
  //   this.contentStates.add('activated');

  //   const contentController = this.contentController(connectionCE);
  //   await contentController.activate(initiator ?? contentController, parent!, flags);

  //   if (this.fromCache || this.fromHistory) {
  //     const elements = Array.from(connectionCE.element.getElementsByTagName('*'));
  //     for (const el of elements) {
  //       const attr = el.getAttribute('au-element-scroll');
  //       if (attr) {
  //         const [top, left] = attr.split(',');
  //         el.removeAttribute('au-element-scroll');
  //         el.scrollTo(+left, +top);
  //       }
  //     }
  //   }
  // }

  public deactivateComponent(initiator: IHydratedController<Element> | null, parent: ICustomElementController<Element, ICustomElementViewModel<Element>> | null, flags: LifecycleFlags, connectionCE: IConnectionCustomElement, stateful: boolean = false): void | Promise<void> {
    // if (this.contentStatus !== ContentStatus.activated) {
    if (!this.contentStates.has('activated')) {
      return;
    }
    // this.contentStatus = ContentStatus.created;
    this.contentStates.delete('activated');

    if (stateful && connectionCE.element !== null) {
      // const contentController = this.content.componentInstance!.$controller!;
      const elements = Array.from(connectionCE.element.getElementsByTagName('*'));
      for (const el of elements) {
        if (el.scrollTop > 0 || el.scrollLeft) {
          el.setAttribute('au-element-scroll', `${el.scrollTop},${el.scrollLeft}`);
        }
      }
    }

    const contentController = this.contentController(connectionCE);
    return Runner.run(
      () => contentController.deactivate(initiator ?? contentController, parent!, flags)
    );
  }

  public freeContent(connectionCE: IConnectionCustomElement | null, nextInstruction: Navigation | null, cache: ViewportContent[], stateful: boolean = false): void | Promise<void> {
    // switch (this.contentStatus) {
    //   case ContentStatus.activated:
    //     await this.leave(nextInstruction);
    //     await this.deactivateComponent(null, connectionCE!.controller, LifecycleFlags.none, connectionCE!, stateful);
    //     this.unloadComponent(cache, stateful); // TODO: Hook up to new dispose
    //   case ContentStatus.created:
    //     this.destroyComponent();
    // }
    // TODO: Fix execution order on these
    // These are all safe to run
    return Runner.run(
      () => this.leave(nextInstruction),
      () => this.deactivateComponent(null, connectionCE!.controller, LifecycleFlags.none, connectionCE!, stateful),
      () => this.unloadComponent(cache, stateful), // TODO: Hook up to new dispose
      () => this.destroyComponent(),
    );
  }

  public toComponentName(): string | null {
    return this.content.componentName;
  }
  public toComponentType(container: IContainer): RouteableComponentType | null {
    if (this.content.isEmpty()) {
      return null;
    }
    return this.content.toComponentType(container);
  }
  public toComponentInstance(container: IContainer): IRouteableComponent | null {
    if (this.content.isEmpty()) {
      return null;
    }
    return this.content.toComponentInstance(container);
  }
}
