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
  k: infer I
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
  <T extends ReturnType<CVA>[]>(...components: [...T]): (
    props?: (
      | UnionToIntersection<
          {
            [K in keyof T]: VariantProps<T[K]>;
          }[number]
        >
      | undefined
    ) &
      CVAClassProp
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

export interface CVA {
  <
    _ extends "cva's generic parameters are restricted to internal use only.",
    V
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
        }
  ): (
    props?: V extends CVAVariantShape
      ? CVAVariantSchema<V> & CVAClassProp
      : CVAClassProp
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

  const cva: CVA = (config) => (props) => {
    if (config?.variants == null)
      return cx(config?.base, props?.class, props?.className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        const variantKey = (falsyToString(variantProp) ||
          falsyToString(
            defaultVariantProp
          )) as keyof typeof variants[typeof variant];

        return variants[variant][variantKey];
      }
    );

    const defaultsAndProps = {
      ...defaultVariants,
      // remove `undefined` props
      ...(props &&
        Object.entries(props).reduce<typeof props>(
          (acc, [key, value]) =>
            typeof value === "undefined" ? acc : { ...acc, [key]: value },
          {} as typeof props
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
      [] as ClassValue[]
    );

    return cx(
      config?.base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      props?.class,
      props?.className
    );
  };

  const compose: Compose =
    (...components) =>
    (props) => {
      const propsWithoutClass = Object.fromEntries(
        Object.entries(props || {}).filter(
          ([key]) => !["class", "className"].includes(key)
        )
      );

      return cx(
        components.map((component) => component(propsWithoutClass)),
        props?.class,
        props?.className
      );
    };

  return {
    compose,
    cva,
    cx,
  };
};

export const { compose, cva, cx } = defineConfig();
