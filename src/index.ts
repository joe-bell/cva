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
  classes.flat(Infinity).filter(Boolean).join(" ");

/* cva
  ============================================ */

type VariantsSchema = Record<string, Record<string, ClassValue>>;

type VariantsConfig<Variants extends VariantsSchema> = {
  [Variant in keyof Variants]?: StringToBoolean<keyof Variants[Variant]>;
};

export const cva =
  <Variants>(
    base?: ClassValue,
    config?: Variants extends VariantsSchema
      ? {
          variants?: Variants;
          defaultVariants?: VariantsConfig<Variants>;
          compoundVariants?: (Variants extends VariantsSchema
            ? VariantsConfig<Variants> & ClassProp
            : ClassProp)[];
        }
      : never
  ) =>
  (
    props?: Variants extends VariantsSchema
      ? VariantsConfig<Variants> & ClassProp
      : ClassProp
  ) => {
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
