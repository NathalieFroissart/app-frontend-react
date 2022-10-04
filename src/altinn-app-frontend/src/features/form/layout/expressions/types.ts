import type { PickByValue } from 'utility-types';

import type { LEFunctions } from 'src/features/form/layout/expressions';
import type { LEContext } from 'src/features/form/layout/expressions/LEContext';

type Functions = typeof LEFunctions;

/**
 * This union type includes all possible functions usable in layout expressions
 */
export type LEFunction = keyof Functions;

export type BaseValue = 'string' | 'number' | 'boolean';
export type BaseToActual<T extends BaseValue> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : never;

/**
 * A version of the type above that avoids spreading union types. Meaning, it only accepts concrete types from inside
 * BaseValue, not the union type BaseValue itself:
 *    type Test1 = BaseToActual<BaseValue>; // string | number | boolean
 *    type Test2 = BaseToActualStrict<BaseValue>; // never
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
export type BaseToActualStrict<T extends BaseValue> = [T] extends ['string']
  ? string
  : [T] extends ['number']
  ? number
  : [T] extends ['boolean']
  ? boolean
  : never;

type ArgsToActual<T extends readonly BaseValue[]> = {
  [Index in keyof T]: BaseToActual<T[Index]>;
};

export interface FuncDef<
  Args extends readonly BaseValue[],
  Ret extends BaseValue,
> {
  impl: (this: LEContext, ...params: ArgsToActual<Args>) => BaseToActual<Ret>;
  args: Args;
  minArguments?: number;
  returns: Ret;

  // Optional: Set this to true if the last argument type is considered a '...spread' argument, meaning
  // all the rest of the arguments should be cast to the last type (and that the function allows any
  // amount  of parameters).
  lastArgSpreads?: true;
}

type BaseValueArgsFor<F extends LEFunction> = F extends LEFunction
  ? Functions[F]['args']
  : never;

type FunctionsReturning<T extends BaseValue> = keyof PickByValue<
  Functions,
  { returns: T }
>;

export type LEReturning<T extends BaseValue> = LayoutExpression<
  FunctionsReturning<T>
>;

/**
 * An expression definition is basically [functionName, ...arguments], but when we map arguments (using their
 * index from zero) in MaybeRecursive (to support recursive expressions) we'll need to place the function name first.
 * Because of a TypeScript limitation we can't do this the easy way, so this hack makes sure to place our argument
 * base value types from index 1 and onwards.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29919
 */
type IndexHack<F extends LEFunction> = [
  'Here goes the function name',
  ...BaseValueArgsFor<F>,
];

type MaybeRecursive<
  F extends LEFunction,
  Iterations extends Prev[number],
  Args extends ('Here goes the function name' | BaseValue)[] = IndexHack<F>,
> = [Iterations] extends [never]
  ? never
  : {
      [Index in keyof Args]: Args[Index] extends BaseValue
        ?
            | BaseToActual<Args[Index]>
            | MaybeRecursive<FunctionsReturning<Args[Index]>, Prev[Iterations]>
        : F;
    };

/**
 * The base type that represents any valid layout expression function call. When used as a type
 * inside a layout definition, you probably want something like LayoutExpressionOr<'boolean'>
 *
 * @see LayoutExpressionOr
 */
export type LayoutExpression<F extends LEFunction = LEFunction> =
  MaybeRecursive<F, 2>;

/**
 * This type represents a layout expression for a function that returns
 * the T type, or just the T type itself.
 */
export type LayoutExpressionOr<T extends BaseValue> =
  | LEReturning<T>
  | BaseToActual<T>;

/**
 * Type that lets you convert a layout expression function name to its return value type
 */
export type ReturnValueFor<Func extends LEFunction> =
  Func extends keyof Functions
    ? BaseToActual<Functions[Func]['returns']>
    : never;

/**
 * This is the heavy lifter for ResolvedLayoutExpression that will recursively work through objects and remove
 * layout expressions (replacing them with the type the layout expression is expected to return).
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
type ResolveDistributive<T> = [T] extends [any]
  ? [T] extends [LayoutExpression<infer Func>]
    ? ReturnValueFor<Func>
    : T extends LayoutExpression
    ? // When using ILayoutExpressionOr<...>, it creates a union type. Removing the ILayoutExpression from this union
      never
    : T extends object
    ? Exclude<LEResolved<T>, LayoutExpression>
    : T
  : never;

/**
 * This type removes all layout expressions from the input type (replacing them with the type
 * the layout expression is expected to return)
 *
 * @see https://stackoverflow.com/a/54487392
 */
export type LEResolved<T> = {
  [P in keyof T]: ResolveDistributive<T[P]>;
};

/**
 * This type can be self-references in order to limit recursion depth for advanced types
 * @see https://stackoverflow.com/a/70552078
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Removes all properties from an object where its keys point to never types. This turns { defunctProp: never } into {}
 */
type OmitNeverKeys<T> = {
  [P in keyof T as T[P] extends never ? never : P]: T[P];
};

type OmitEmptyObjects<T> = T extends Record<string, never> ? never : T;

type OmitNeverArrays<T> = T extends never[] ? never : T;

/**
 * This is the heavy lifter used by LayoutExpressionDefaultValues to recursively iterate types
 */
type ReplaceDistributive<T, Iterations extends Prev[number]> = [T] extends [
  LayoutExpressionOr<infer BT>,
]
  ? BaseToActualStrict<BT>
  : [T] extends [object]
  ? OmitEmptyObjects<LEDefaultValues<T, Prev[Iterations]>>
  : never;

/**
 * This type looks through an object recursively, finds any layout expressions, and requires you to provide a default
 * value for them (i.e. a fallback value should the layout expression evaluation fail).
 */
export type LEDefaultValues<
  T,
  Iterations extends Prev[number] = 1, // <-- Recursion depth limited to 2 levels by default
> = [Iterations] extends [never]
  ? never
  : Required<
      OmitNeverKeys<{
        [P in keyof T]: OmitNeverArrays<ReplaceDistributive<T[P], Iterations>>;
      }>
    >;
