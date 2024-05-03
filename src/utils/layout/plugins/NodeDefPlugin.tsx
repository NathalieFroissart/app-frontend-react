import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import type { SerializableSetting } from 'src/codegen/SerializableSetting';
import type { NodeRef } from 'src/layout';
import type { CompInternal, CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps, ExprResolver } from 'src/layout/LayoutComponent';
import type { ChildLookupRestriction } from 'src/utils/layout/HierarchyGenerator';
import type { BaseItemState, ItemStore, StateFactoryProps } from 'src/utils/layout/itemState';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface DefPluginConfig {
  componentType: CompTypes;
  expectedFromExternal?: Record<string, any>;
  extraState?: Record<string, any>;
  extraInItem?: Record<string, any>;
  settings?: any;
}

interface DefPluginBaseItemState<Config extends DefPluginConfig> extends BaseItemState<DefPluginCompType<Config>> {
  item: DefPluginCompInternal<Config> & DefPluginExtraInItem<Config>;
}

export type DefPluginCompType<Config extends DefPluginConfig> = Config['componentType'];
export type DefPluginExtraState<Config extends DefPluginConfig> = Config['extraState'];
export type DefPluginExtraInItem<Config extends DefPluginConfig> = Config['extraInItem'];
export type DefPluginCompInternal<Config extends DefPluginConfig> = CompInternal<DefPluginCompType<Config>>;
export type DefPluginState<Config extends DefPluginConfig> = DefPluginBaseItemState<Config> &
  DefPluginExtraState<Config>;
export type DefPluginStateFactoryProps<Config extends DefPluginConfig> = StateFactoryProps<DefPluginCompType<Config>>;
export type DefPluginExprResolver<Config extends DefPluginConfig> = Omit<
  ExprResolver<DefPluginCompType<Config>>,
  'item'
> & {
  item: DefPluginCompExternal<Config>;
};
export type DefPluginCompExternal<Config extends DefPluginConfig> = Config['expectedFromExternal'];
export type DefPluginChildClaimerProps<Config extends DefPluginConfig> = ChildClaimerProps<
  DefPluginCompType<Config>
> & {
  item: DefPluginCompExternal<Config>;
};
export type DefPluginSettings<Config extends DefPluginConfig> = Config['settings'];
export type ConfigFromDefPlugin<C extends NodeDefPlugin<any>> = C extends NodeDefPlugin<infer Config> ? Config : never;

/**
 * A node state plugin work when generating code for a component. Adding such a plugin to your component
 * will extend the functionality of the component storage. The output of these functions will be added to the
 * generated code for the component.
 */
export abstract class NodeDefPlugin<Config extends DefPluginConfig> {
  public import: GenerateImportedSymbol<any>;

  public constructor(protected settings?: Config['settings']) {
    this.import = this.makeImport();
  }

  /**
   * This makes sure the code generator can use ${plugin} in string templates to automatically import the correct
   * symbol in the target file.
   */
  public toString() {
    return this.import.toString();
  }

  /**
   * Makes the import object. This will run on instantiation of the plugin.
   */
  abstract makeImport(): GenerateImportedSymbol<any>;

  /**
   * Adds the plugin to the component. This can be used to verify that the target component is valid and can include
   * the plugin, and/or add custom properties to the component that is needed for this plugin to work.
   */
  abstract addToComponent(component: ComponentConfig): void;

  /**
   * Makes a key that keeps this plugin unique. This is used to make sure that if we're adding the same plugin
   * multiple times to the same component, only uniquely configured plugins are added.
   */
  getKey(): string {
    // By default, no duplicate plugins of the same type are allowed.
    return this.constructor.name;
  }

  /**
   * Makes constructor arguments (must be a string, most often JSON). This is used to add custom constructor arguments
   * when instantiating this plugin in code generation.
   */
  makeConstructorArgs(asGenericArgs = false): string {
    if (this.settings) {
      return this.serializeSettings(this.settings, asGenericArgs);
    }
    return '';
  }

  /**
   * Useful tool when you have the concept of 'default' settings in your plugin. This will make the constructor
   * arguments, but omits any settings that are the same as the default settings.
   */
  protected makeConstructorArgsWithoutDefaultSettings(defaults: unknown, asGenericArgs: boolean): string {
    const settings = this.settings;
    if (settings && typeof settings === 'object' && defaults && typeof defaults === 'object') {
      const nonDefaultSettings: any = Object.keys(settings)
        .filter((key) => settings[key] !== defaults[key])
        .reduce((acc, key) => {
          acc[key] = settings[key];
          return acc;
        }, {});

      return this.serializeSettings(nonDefaultSettings, asGenericArgs);
    }

    throw new Error('Settings must be an object');
  }

  protected serializeSettings(settings: unknown, asGenericArgs: boolean) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object');
    }

    const lines: string[] = [];
    for (const _key of Object.keys(settings)) {
      const value = settings[_key];
      const key = asGenericArgs ? _key : JSON.stringify(_key);

      // If value is a class object, check if it has the 'serializeSetting' method, i.e. that it implements the
      // SerializableSetting interface
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as any).serializeToTypeDefinition === 'function' &&
        typeof (value as any).serializeToTypeScript === 'function'
      ) {
        const valueAsInstance = value as SerializableSetting;
        const result = asGenericArgs
          ? valueAsInstance.serializeToTypeDefinition()
          : valueAsInstance.serializeToTypeScript();
        lines.push(`${key}: ${result}`);
        continue;
      }

      // All other non-primitives are prohibited
      if (value && typeof value === 'object') {
        throw new Error(`Settings object contains non-serializable value: ${_key}`);
      }

      const valueJson = JSON.stringify(value);
      const constValue = asGenericArgs ? valueJson : `${valueJson} as const`;
      lines.push(`${key}: ${constValue}`);
    }

    return `{${lines.join(',')}}`;
  }

  /**
   * Makes generic arguments (YourClass<THIS THING HERE>) for the plugin. This is used to list the component plugin
   * configurations for components.
   */
  makeGenericArgs(): string {
    return this.makeConstructorArgs(true);
  }

  /**
   * Adds state factory properties to the component. This is called when creating the state for the component for the
   * first time.
   */
  stateFactory(_props: DefPluginStateFactoryProps<Config>): DefPluginExtraState<Config> {
    return {} as DefPluginExtraState<Config>;
  }

  /**
   * Evaluates some expressions for the component. This can be used to add custom expressions to the component.
   */
  evalDefaultExpressions(_props: DefPluginExprResolver<Config>): DefPluginExtraInItem<Config> {
    return {} as DefPluginExtraInItem<Config>;
  }

  /**
   * Outputs the code to render any child components that are needed for this plugin to work.
   * The reason this expects a string instead of JSX is because the code generator will run this function
   * and insert the output into the generated code. If we just output a reference to this function, the code
   * generator would have to load our entire application to run this function, which would inevitably lead to
   * circular dependencies and import errors (i.e. trying to import CSS into a CLI tool).
   */
  extraNodeGeneratorChildren(): string {
    return '';
  }

  /**
   * Outputs any extra method definitions the component Def class needs to have. This can be used to add custom
   * methods to the component, or force the component to implement certain methods (by making them abstract).
   */
  extraMethodsInDef(): string[] {
    return [];
  }
}

/**
 * Implement this interface if your plugin/component needs to support children in some form.
 */
export interface NodeDefChildrenPlugin<Config extends DefPluginConfig> {
  claimChildren(props: DefPluginChildClaimerProps<Config>): void;
  pickDirectChildren(state: DefPluginState<Config>, restriction?: ChildLookupRestriction): NodeRef[];
  pickChild<C extends CompTypes>(state: DefPluginState<Config>, childId: string, parentPath: string[]): ItemStore<C>;
  addChild(state: DefPluginState<Config>, childNode: LayoutNode, childStore: ItemStore): void;
  removeChild(state: DefPluginState<Config>, childNode: LayoutNode): void;
}

export function isNodeDefChildrenPlugin(plugin: any): plugin is NodeDefChildrenPlugin<any> {
  return (
    typeof plugin.claimChildren === 'function' &&
    typeof plugin.pickDirectChildren === 'function' &&
    typeof plugin.pickChild === 'function' &&
    typeof plugin.addChild === 'function' &&
    typeof plugin.removeChild === 'function'
  );
}
