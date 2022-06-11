import type {
  ClassProp,
  ClassValue,
  OmitUndefined,
  StringToBoolean,
} from "./types";

export type VariantProps<Component extends (...args: any) => any> =
  OmitUndefined<Parameters<Component>[0]>;

const booleanToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value;

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

type VariantsConfig<Variants extends ConfigSchema> = {
  [Variant in keyof Variants]?: StringToBoolean<keyof Variants[Variant]>;
};

type Config<Variants> = Variants extends ConfigSchema
  ? {
      variants?: Variants;
      defaultVariants?: VariantsConfig<Variants>;
      compoundVariants?: (Variants extends ConfigSchema
        ? VariantsConfig<Variants> & ClassProp
        : ClassProp)[];
    }
  : never;

type Props<Variants> = Variants extends ConfigSchema
  ? VariantsConfig<Variants> & ClassProp
  : ClassProp;

export const cva =
  <Variants>(base?: ClassValue, config?: Config<Variants>) =>
  (props?: Props<Variants>) => {
    const className = props?.class;

    if (config?.variants == null) return cx(base, className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        if (variantProp === null) return null;

        const variantKey = (booleanToString(variantProp) ||
          booleanToString(
            defaultVariantProp
          )) as keyof typeof variants[typeof variant];

        return variants[variant][variantKey];
      }
    );

    const propsWithoutUndefined =
      props &&
      Object.entries(props).reduce((acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }

        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);

    const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
      (acc, { class: classNames, ...compoundVariantOptions }) => {
        if (classNames == null) return acc;

        return Object.entries(compoundVariantOptions).every(
          ([key, value]) =>
            ({
              ...defaultVariants,
              ...propsWithoutUndefined,
            }[key] === value)
        )
          ? [...acc, classNames]
          : acc;
      },
      [] as ClassValue[]
    );

    return cx(
      base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      className
    );
  };
