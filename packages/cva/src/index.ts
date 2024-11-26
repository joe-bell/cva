/**
 * Copyright 2022 Joe Bell. All rights reserved.
 *
 * This file is licensed to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
import { clsx } from "clsx";

/* Types
  ============================================ */

/* clsx
  ---------------------------------- */

// When compiling with `declaration: true`, many projects experience the dreaded
// TS2742 error. To combat this, we copy clsx's types manually.
// Should this project move to JSDoc, this workaround would no longer be needed.

type ClassValue =
  | ClassArray
  | ClassDictionary
  | string
  | number
  | null
  | boolean
  | undefined;
type ClassDictionary = Record<string, any>;
type ClassArray = ClassValue[];

/* Utils
  ---------------------------------- */

type OmitUndefined<T> = T extends undefined ? never : T;
type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

/* compose
  ---------------------------------- */

export interface Compose {
  <T extends ReturnType<CVA>[]>(
    ...components: [...T]
  ): (
    props?: (
      | UnionToIntersection<
          {
            [K in keyof T]: VariantProps<T[K]>;
          }[number]
        >
      | undefined
    ) &
      CVAClassProp,
  ) => string;
}

/* cx
  ---------------------------------- */

export interface CX {
  (...inputs: ClassValue[]): string;
}

export type CXOptions = Parameters<CX>;
export type CXReturn = ReturnType<CX>;

/* cva
  ============================================ */

type CVAConfigBase = { base?: ClassValue };
type CVAVariantShape = Record<string, Record<string, ClassValue>>;
type CVAVariantSchema<V extends CVAVariantShape> = {
  [Variant in keyof V]?: StringToBoolean<keyof V[Variant]> | undefined;
};
type CVAClassProp =
  | {
      class?: ClassValue;
      className?: never;
    }
  | {
      class?: never;
      className?: ClassValue;
    };

type CVACompoundVariants<V> = (V extends CVAVariantShape
  ? (
      | CVAVariantSchema<V>
      | {
          [Variant in keyof V]?:
            | StringToBoolean<keyof V[Variant]>
            | StringToBoolean<keyof V[Variant]>[]
            | undefined;
        }
    ) &
      CVAClassProp
  : CVAClassProp)[];

export interface CVA {
  <
    _ extends "cva's generic parameters are restricted to internal use only.",
    V,
  >(
    config: V extends CVAVariantShape
      ? CVAConfigBase & {
          variants?: V;
          compoundVariants?: CVACompoundVariants<V>;
          defaultVariants?: CVAVariantSchema<V>;
        }
      : CVAConfigBase & {
          variants?: never;
          compoundVariants?: never;
          defaultVariants?: never;
        },
  ): (
    props?: V extends CVAVariantShape
      ? CVAVariantSchema<V> & CVAClassProp
      : CVAClassProp,
  ) => string;
}

/* defineConfig
  ---------------------------------- */

export interface DefineConfigOptions {
  hooks?: {
    /**
     * @deprecated please use `onComplete`
     */
    "cx:done"?: (className: string) => string;
    /**
     * Returns the completed string of concatenated classes/classNames.
     */
    onComplete?: (className: string) => string;
  };
}

export interface DefineConfig {
  (options?: DefineConfigOptions): {
    compose: Compose;
    cx: CX;
    cva: CVA;
  };
}
/* Internal helper functions 
  ============================================ */

/**
 * Type guard.
 * Determines whether an object has a property with the specified name.
 * */
function isKeyOf<R extends Record<PropertyKey, unknown>, V = keyof R>(
  record: R,
  key: unknown,
): key is V {
  return (
    (typeof key === "string" ||
      typeof key === "number" ||
      typeof key === "symbol") &&
    Object.prototype.hasOwnProperty.call(record, key)
  );
}

/**
 * Merges two given objects, Props take precedence over Defaults
 * */
function mergeDefaultsAndProps<
  V extends CVAVariantShape,
  P extends Record<PropertyKey, unknown>,
  D extends CVAVariantSchema<V>,
>(props: P = {} as P, defaults: D = {} as D) {
  const result: Record<PropertyKey, unknown> = { ...defaults };

  for (const key in props) {
    if (!isKeyOf(props, key)) continue;
    const value = props[key];
    if (typeof value !== "undefined") result[key] = value;
  }

  return result as Record<keyof V, NonNullable<ClassValue>>;
}

/**
 * Returns a list of class variants based on the given Props and Defaults
 * */
function getVariantClassNames<
  V extends CVAVariantShape,
  P extends Record<PropertyKey, unknown> & CVAClassProp,
  D extends CVAVariantSchema<V>,
>(variants: V, props: P = {} as P, defaults: D = {} as D) {
  const variantClassNames: ClassArray = [];

  for (const variant in variants) {
    if (!isKeyOf(variants, variant)) continue;
    const variantProp = props[variant];
    const defaultVariantProp = defaults[variant];

    const variantKey =
      falsyToString(variantProp) || falsyToString(defaultVariantProp);

    if (isKeyOf(variants[variant], variantKey))
      variantClassNames.push(variants[variant][variantKey]);
  }

  return variantClassNames;
}

/**
 * Returns selected compound className variants based on Props and Defaults
 * */
function getCompoundVariantClassNames<V extends CVAVariantShape>(
  compoundVariants: CVACompoundVariants<V>,
  defaultsAndProps: ClassDictionary,
) {
  const compoundClassNames: ClassArray = [];

  for (const compoundConfig of compoundVariants) {
    let selectorMatches = true;

    for (const cvKey in compoundConfig) {
      if (
        !isKeyOf(compoundConfig, cvKey) ||
        cvKey === "class" ||
        cvKey === "className"
      )
        continue;

      const cvSelector = compoundConfig[cvKey];
      const selector = defaultsAndProps[cvKey];

      const matches = Array.isArray(cvSelector)
        ? cvSelector.includes(selector)
        : selector === cvSelector;

      if (!matches) {
        selectorMatches = false;
        break;
      }
    }

    if (selectorMatches)
      compoundClassNames.push(compoundConfig.class ?? compoundConfig.className);
  }

  return compoundClassNames;
}

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

/* Exports
  ============================================ */

export const defineConfig: DefineConfig = (options) => {
  const cx: CX = (...inputs) => {
    if (typeof options?.hooks?.["cx:done"] !== "undefined")
      return options?.hooks["cx:done"](clsx(inputs));
    if (typeof options?.hooks?.onComplete !== "undefined")
      return options?.hooks.onComplete(clsx(inputs));

    return clsx(inputs);
  };

  const cva: CVA = (config) => {
    const {
      variants,
      defaultVariants = {},
      base,
      compoundVariants = [],
    } = config ?? {};

    if (variants == null)
      return (props) => cx(base, props?.class, props?.className);

    return (props) => {
      const variantClassNames = getVariantClassNames(
        variants,
        props,
        defaultVariants,
      );

      const compoundVariantClassNames = getCompoundVariantClassNames(
        compoundVariants,
        mergeDefaultsAndProps(props, defaultVariants),
      );

      return cx(
        base,
        variantClassNames,
        compoundVariantClassNames,
        props?.class,
        props?.className,
      );
    };
  };

  const compose: Compose =
    (...components) =>
    (props) => {
      const { class: _class, className, ...propsWithoutClass } = props ?? {};

      return cx(
        components.map((component) => component(propsWithoutClass)),
        props?.class,
        props?.className,
      );
    };

  return {
    compose,
    cva,
    cx,
  };
};

export const { compose, cva, cx } = defineConfig();
