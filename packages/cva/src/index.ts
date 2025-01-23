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

export type ClassValue =
  | ClassArray
  | ClassDictionary
  | string
  | number
  | bigint
  | null
  | boolean
  | undefined;
export type ClassDictionary = Record<string, any>;
export type ClassArray = ClassValue[];

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
type VariantValue = string | number | boolean;
type CVAClassProp =
  | {
      class?: ClassValue;
      className?: never;
    }
  | {
      class?: never;
      className?: ClassValue;
    };

export interface CVA {
  <
    _ extends "cva's generic parameters are restricted to internal use only.",
    V,
  >(
    config: V extends CVAVariantShape
      ? CVAConfigBase & {
          variants?: V;
          compoundVariants?: (V extends CVAVariantShape
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
  ) => string & {
    schema: V extends CVAVariantShape
      ? {
          [Variant in keyof V]: ReadonlyArray<
            StringToBoolean<Extract<keyof V[Variant], VariantValue>>
          >;
          // {
          //   [Variant in keyof V]?: StringToBoolean<keyof V[Variant]> | undefined;
          // };
        }
      : never;
  };
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

/* Exports
  ============================================ */

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
const normalizeVariantKey = <T extends string>(value: T) => {
  if (value === "true") return true;
  if (value === "false") return false;

  const maybeNumber = Number(value);
  if (!Number.isNaN(maybeNumber)) return maybeNumber;

  return value;
};

export const defineConfig: DefineConfig = (options) => {
  const cx: CX = (...inputs) => {
    if (typeof options?.hooks?.["cx:done"] !== "undefined")
      return options?.hooks["cx:done"](clsx(inputs));

    if (typeof options?.hooks?.onComplete !== "undefined")
      return options?.hooks.onComplete(clsx(inputs));

    return clsx(inputs);
  };

  const cva: CVA = (config) =>
    Object.assign(
      ((props) => {
        if (config?.variants == null)
          return cx(config?.base, props?.class, props?.className);

        const { variants, defaultVariants } = config;

        const getVariantClassNames = Object.keys(variants).map(
          (variant: keyof typeof variants) => {
            const variantProp = props?.[variant as keyof typeof props];
            const defaultVariantProp = defaultVariants?.[variant];

            const variantKey = (falsyToString(variantProp) ||
              falsyToString(
                defaultVariantProp,
              )) as keyof (typeof variants)[typeof variant];

            return variants[variant][variantKey];
          },
        );

        const defaultsAndProps = {
          ...defaultVariants,
          // remove `undefined` props
          ...(props &&
            Object.entries(props).reduce<typeof props>(
              (acc, [key, value]) =>
                typeof value === "undefined" ? acc : { ...acc, [key]: value },
              {} as typeof props,
            )),
        };

        const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
          (acc, { class: cvClass, className: cvClassName, ...cvConfig }) =>
            Object.entries(cvConfig).every(([cvKey, cvSelector]) => {
              const selector =
                defaultsAndProps[cvKey as keyof typeof defaultsAndProps];

              return Array.isArray(cvSelector)
                ? cvSelector.includes(selector)
                : selector === cvSelector;
            })
              ? [...acc, cvClass, cvClassName]
              : acc,
          [] as ClassValue[],
        );

        return cx(
          config?.base,
          getVariantClassNames,
          getCompoundVariantClassNames,
          props?.class,
          props?.className,
        );
      }) as ReturnType<CVA>,
      {
        schema: config?.variants
          ? Object.fromEntries(
              Object.entries(config?.variants).map(([key, value]) => [
                key,
                Object.keys(value).map((propertyKey) =>
                  normalizeVariantKey(propertyKey),
                ),
              ]),
            )
          : {},
      },
    );

  const compose: Compose =
    (...components) =>
    (props) => {
      const propsWithoutClass = Object.fromEntries(
        Object.entries(props || {}).filter(
          ([key]) => !["class", "className"].includes(key),
        ),
      );

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
