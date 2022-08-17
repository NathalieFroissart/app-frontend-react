import { ExpressionContext } from 'src/features/form/layout/expressions/ExpressionContext';
import type { ContextDataSources } from 'src/features/form/layout/expressions/ExpressionContext';
import type {
  BaseToActual,
  BaseValue,
  FuncDef,
  ILayoutExpression,
  ILayoutExpressionLookupFunctions,
} from 'src/features/form/layout/expressions/types';
import type { LayoutNode } from 'src/utils/layout/hierarchy';

/**
 * Run/evaluate a layout expression. You have to provide your own context containing functions for looking up external
 * values. If you need a more concrete implementation:
 * @see useLayoutExpression
 */
export function evalExpr(
  expr: ILayoutExpression,
  node: LayoutNode,
  dataSources: ContextDataSources,
  defaultValue: any = -3571284,
) {
  const ctx = ExpressionContext.withBlankPath(expr, node, dataSources);

  try {
    return innerEvalExpr(ctx);
  } catch (err) {
    if (defaultValue === -3571284) {
      // We cannot possibly know the expected default value here, so there are no safe ways to fail here except
      // throwing the exception to let everyone know we failed.
      throw err;
    } else {
      // When we know of a default value, we can safely print it as an error to the console and safely recover
      (err.context || ctx).trace(err, defaultValue);
      return defaultValue;
    }
  }
}

function innerEvalExpr(context: ExpressionContext) {
  const expr = context.getExpr();

  const argTypes =
    expr.function in context.lookup
      ? ['string']
      : layoutExpressionFunctions[expr.function].args;
  const returnType =
    expr.function in context.lookup
      ? 'string'
      : layoutExpressionFunctions[expr.function].returns;

  const computedArgs = expr.args.map((arg, idx) => {
    const argContext = ExpressionContext.withPath(context, [
      ...context.path,
      `args[${idx}]`,
    ]);

    const argValue =
      typeof arg === 'object' && arg !== null ? innerEvalExpr(argContext) : arg;

    return castValue(argValue, argTypes[idx], argContext);
  });

  const actualFunc: (...args: any) => any =
    expr.function in context.lookup
      ? context.lookup[expr.function]
      : layoutExpressionFunctions[expr.function].impl;

  const returnValue = actualFunc.apply(context, computedArgs);
  return castValue(returnValue, returnType, context);
}

function castValue<T extends BaseValue>(
  value: any,
  toType: T,
  context: ExpressionContext,
): BaseToActual<T> {
  if (!(toType in layoutExpressionCastToType)) {
    throw new Error(`Cannot cast to type: ${JSON.stringify(toType)}`);
  }

  return layoutExpressionCastToType[toType].apply(context, [value]);
}

export class ExpressionRuntimeError extends Error {
  public constructor(public context: ExpressionContext, message: string) {
    super(message);
  }
}

export class LookupNotFound extends ExpressionRuntimeError {
  public constructor(
    context: ExpressionContext,
    lookup: keyof ILayoutExpressionLookupFunctions,
    key: string,
    extra?: string,
  ) {
    super(
      context,
      `Unable to find ${lookup} with identifier ${key}${
        extra ? ` ${extra}` : ''
      }`,
    );
  }
}

export class UnexpectedType extends ExpressionRuntimeError {
  public constructor(
    context: ExpressionContext,
    expected: string,
    actual: any,
  ) {
    super(context, `Expected ${expected}, got value ${JSON.stringify(actual)}`);
  }
}

function defineFunc<Args extends BaseValue[], Ret extends BaseValue>(
  def: FuncDef<Args, Ret>,
): FuncDef<Args, Ret> {
  return def;
}

export const layoutExpressionFunctions = {
  equals: defineFunc({
    impl: (arg1, arg2) => arg1 == arg2,
    args: ['string', 'string'],
    returns: 'boolean',
  }),
  notEquals: defineFunc({
    impl: (arg1, arg2) => arg1 != arg2,
    args: ['string', 'string'],
    returns: 'boolean',
  }),
  greaterThan: defineFunc({
    impl: (arg1, arg2) => arg1 > arg2,
    args: ['number', 'number'],
    returns: 'boolean',
  }),
  greaterThanEq: defineFunc({
    impl: (arg1, arg2) => arg1 >= arg2,
    args: ['number', 'number'],
    returns: 'boolean',
  }),
  lessThan: defineFunc({
    impl: (arg1, arg2) => arg1 < arg2,
    args: ['number', 'number'],
    returns: 'boolean',
  }),
  lessThanEq: defineFunc({
    impl: (arg1, arg2) => arg1 <= arg2,
    args: ['number', 'number'],
    returns: 'boolean',
  }),
};

export const layoutExpressionCastToType: {
  [Type in BaseValue]: (
    this: ExpressionContext,
    arg: any,
  ) => BaseToActual<Type>;
} = {
  boolean: function (arg) {
    if (typeof arg === 'boolean') {
      return arg;
    }
    if (typeof arg === 'string') {
      if (arg === 'true') return true;
      if (arg === 'false') return false;
      if (arg === '1') return true;
      if (arg === '0') return false;
    }
    if (typeof arg === 'number') {
      if (arg === 1) return true;
      if (arg === 0) return false;
    }
    throw new UnexpectedType(this, 'boolean', arg);
  },
  string: function (arg) {
    if (typeof arg === 'boolean' || typeof arg === 'number') {
      return JSON.stringify(arg);
    }
    if (arg === null || typeof arg === 'undefined') {
      return 'null';
    }

    return arg;
  },
  number: function (arg) {
    if (typeof arg === 'number' || typeof arg === 'bigint') {
      return arg as number;
    }
    if (typeof arg === 'string') {
      if (arg.match(/^\d+$/)) {
        return parseInt(arg, 10);
      }
      if (arg.match(/^[\d.]+$/)) {
        return parseFloat(arg);
      }
    }

    throw new UnexpectedType(this, 'number', arg);
  },
};