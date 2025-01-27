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
type CVAClassProp =
  | {
      class?: ClassValue;
      className?: never;
    }
  | {
      class?: never;
      className?: ClassValue;
    };

type InternalOnlyWarning =
  "cva's generic parameters are restricted to internal use only.";

type CVAConfig<Config, Variants> = Config &
  (Variants extends CVAVariantShape
    ? CVAConfigBase & {
        variants?: Variants;
        compoundVariants?: (Variants extends CVAVariantShape
          ? (
              | CVAVariantSchema<Variants>
              | {
                  [Variant in keyof Variants]?:
                    | StringToBoolean<keyof Variants[Variant]>
                    | StringToBoolean<keyof Variants[Variant]>[]
                    | undefined;
                }
            ) &
              CVAClassProp
          : CVAClassProp)[];
        defaultVariants?: CVAVariantSchema<Variants>;
      }
    : CVAConfigBase & {
        variants?: never;
        compoundVariants?: never;
        defaultVariants?: never;
      });

export interface CVA {
  <_ extends InternalOnlyWarning, Config, Variants>(
    config: CVAConfig<Config, Variants>,
  ): {
    (
      props?: Variants extends CVAVariantShape
        ? CVAVariantSchema<Variants> & CVAClassProp
        : CVAClassProp,
    ): string;
    config: Config;
  };
}

/* defineConfig
  ---------------------------------- */

export interface DefineConfigOptions {
  hooks?: {
    /**
     * @deprecated please use `onComplete`
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

export const defineConfig: DefineConfig = (options) => {
  const cx: CX = (...inputs) => {
    if (typeof options?.hooks?.["cx:done"] !== "undefined")
      return options?.hooks["cx:done"](clsx(inputs));

    if (typeof options?.hooks?.onComplete !== "undefined")
      return options?.hooks.onComplete(clsx(inputs));

    return clsx(inputs);
  };

  const cva: CVA = (config) => {
    const component = (
      // TODO: fix types
      // @ts-expect-error
      props,
    ) => {
      if (config?.variants == null) {
        return cx(config?.base, props?.class, props?.className);
      }

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
    };

    component.config = config;

    return component;
  };

  const compose: Compose = (...components) => {
    // TODO: fix types
    // @ts-expect-error
    const component = (props) => {
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

    component.config = components.reduce((acc, { config }) => {
      Object.entries(config || {}).forEach(([key, value]) => {
        // TODO: fix types
        // @ts-expect-error
        acc[key] =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? {
                // TODO: fix types
                // @ts-expect-error
                ...acc[key],
                ...value,
              }
            : value;
      });
      return acc;
    }, {});

    return component;
  };

  return {
    compose,
    cva,
    cx,
  };
};

export const { compose, cva, cx } = defineConfig();

export interface CreateSchema {
  <_ extends InternalOnlyWarning, Component, Config, Variants>(
    component: Component &
      (Component extends ReturnType<CVA>
        ? { config: CVAConfig<Config, Variants> }
        : never),
  ): {
    // TODO
    // - Return never if no variants
    // - return never if no defaultVariants
    [Variant in keyof Variants]: {
      values: ReadonlyArray<StringToBoolean<keyof Variants[Variant]>>;
      defaultValue: Readonly<
        StringToBoolean<
          // TODO: fix types
          // Type '"defaultVariants"' cannot be used to index type 'Config'.ts(2536)
          // Type 'Variant' cannot be used to index type 'Config["defaultVariants"]'.ts(2536)
          // @ts-expect-error
          Config["defaultVariants"][Variant]
        >
      >;
    };
  };
}

export const getSchema: CreateSchema = (component) => {
  // TODO: fix types
  // Remove `any` if possible
  if (!component.config?.variants) return {} as any;

  return Object.fromEntries(
    Object.entries(component.config.variants).map(([key, value]) => {
      const defaultValue = component.config.defaultVariants?.[key] as any;

      return [
        key,
        {
          // TODO: possibly refine
          values: Object.keys(value).map((v) =>
            v === "true" ? true : v === "false" ? false : v,
          ) as StringToBoolean<keyof typeof value>[],
          ...(defaultValue == null ? {} : { defaultValue }),
        },
      ];
    }),
  );
};
