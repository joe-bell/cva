import type {
  ClassProp,
  ClassValue,
  OmitUndefined,
  StringToBoolean,
} from "./types";

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class" | "className"
>;

const falsyToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;

/* cx
  ============================================ */

export type CxOptions = ClassValue[];
export type CxReturn = string;

export const cx = <T extends CxOptions>(...classes: T): CxReturn =>
  // @ts-ignore
  classes.flat(Infinity).filter(Boolean).join(" ");

/* cva
  ============================================ */

type ConfigSchema = Record<string, Record<string, ClassValue>>;

type ConfigVariants<T extends ConfigSchema> = {
  [Variant in keyof T]?: StringToBoolean<keyof T[Variant]> | "unset";
};
type ConfigVariantsMulti<T extends ConfigSchema> = {
  [Variant in keyof T]?:
    | StringToBoolean<keyof T[Variant]>
    | StringToBoolean<keyof T[Variant]>[];
};

type Config<T> = T extends ConfigSchema
  ? {
      base?: ClassValue;
      variants?: T;
      defaultVariants?: ConfigVariants<T>;
      compoundVariants?: (T extends ConfigSchema
        ? (ConfigVariants<T> | ConfigVariantsMulti<T>) & ClassProp
        : ClassProp)[];
    }
  : never;

type Props<T> = T extends ConfigSchema
  ? ConfigVariants<T> & ClassProp
  : ClassProp;

export const cva =
  <T>(config: Config<T>) =>
  (props?: Props<T>) => {
    if (config?.variants == null)
      return cx(config?.base, props?.class, props?.className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        if (variantProp === "unset") return undefined;

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
