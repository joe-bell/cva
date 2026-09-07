import type * as CVA from "./";
import { cva, getSchema } from "./";

describe("cva type contracts", () => {
  test("keeps component parameters, variant props, and returns exact", () => {
    const button = cva({
      variants: {
        disabled: { unset: null, true: "disabled", false: "enabled" },
        m: { 0: "m-0", 1: "m-1" },
        intent: { primary: "primary", secondary: "secondary" },
      },
    });

    type ButtonProps =
      | ({
          disabled?: boolean | "unset" | undefined;
          m?: 0 | 1 | undefined;
          intent?: "primary" | "secondary" | undefined;
        } & (
          | { class?: CVA.ClassValue; className?: never }
          | { class?: never; className?: CVA.ClassValue }
        ))
      | undefined;

    expectTypeOf<Parameters<typeof button>[0]>().toEqualTypeOf<ButtonProps>();
    expectTypeOf<ReturnType<typeof button>>().toEqualTypeOf<string>();
    expectTypeOf<CVA.VariantProps<typeof button>>().toEqualTypeOf<{
      disabled?: boolean | "unset" | undefined;
      m?: 0 | 1 | undefined;
      intent?: "primary" | "secondary" | undefined;
    }>();

    button();
    button(undefined);
    button({ disabled: true, m: 0 });
    button({ disabled: false, m: 1 });
    button({ class: "button" });
    button({ className: "button" });
    // @ts-expect-error — beta components do not accept null props
    button(null);
    // @ts-expect-error — unknown variant names are rejected
    button({ unknown: "value" });
    // @ts-expect-error — unknown variant values are rejected
    button({ intent: "unknown" });
    // @ts-expect-error — boolean variant props do not accept stringified values
    button({ disabled: "true" });
    // @ts-expect-error — numeric variant props do not accept stringified values
    button({ m: "0" });
    // @ts-expect-error — class and className are mutually exclusive
    button({ class: "button", className: "button" });
  });

  test("rejects invalid beta configurations", () => {
    // prettier-ignore
    // @ts-expect-error — defaults must target a declared value
    cva({ variants: { tone: { quiet: "quiet", loud: "loud" } }, defaultVariants: { tone: "unknown" } });
    // prettier-ignore
    // @ts-expect-error — compound selectors must target declared values
    cva({ variants: { tone: { quiet: "quiet", loud: "loud" } }, compoundVariants: [{ tone: "unknown", class: "compound" }] });
    // prettier-ignore
    // @ts-expect-error — compound class props are mutually exclusive
    cva({ variants: { tone: { quiet: "quiet", loud: "loud" } }, compoundVariants: [{ tone: "quiet", class: "compound", className: "compound" }] });
    // @ts-expect-error — beta cva requires a configuration object
    cva();
  });

  test("keeps canonical and noncanonical schema keys distinct", () => {
    const component = cva({
      variants: {
        offset: { 1: "one", "01": "leading-zero", " 1": "space", "": "empty" },
      },
      defaultVariants: { offset: 1 },
    });
    const schema = getSchema(component);

    // Integer keys enumerate first, then noncanonical string keys in insertion order.
    expect(schema).toStrictEqual({
      offset: { values: [1, "01", " 1", ""], defaultValue: 1 },
    });
    expectTypeOf(schema).toEqualTypeOf<{
      offset: {
        values: readonly (1 | "01" | " 1" | "")[];
        defaultValue: 1;
      };
    }>();
  });

  test("keeps nested readonly composition props exact", () => {
    const spacing = cva({
      variants: { gap: { sm: "gap-sm", lg: "gap-lg" } },
      defaultVariants: { gap: "sm" },
    });
    const tone = cva({
      variants: { tone: { quiet: "quiet", loud: "loud" } },
      defaultVariants: { tone: "quiet" },
    });
    const middle = cva({ composes: [spacing, tone] as const });
    const card = cva({ composes: [middle] as const });

    expectTypeOf<CVA.VariantProps<typeof card>>().toEqualTypeOf<{
      gap?: "sm" | "lg" | undefined;
      tone?: "quiet" | "loud" | undefined;
    }>();
    expectTypeOf(getSchema(card)).toEqualTypeOf<{
      gap: { values: readonly ("sm" | "lg")[]; defaultValue: "sm" };
      tone: { values: readonly ("quiet" | "loud")[]; defaultValue: "quiet" };
    }>();
  });

  test("keeps the last composed default literal exact", () => {
    const compact = cva({
      variants: { pad: { sm: "pad-sm", lg: "pad-lg" } },
      defaultVariants: { pad: "sm" },
    });
    const spacious = cva({
      variants: { pad: { sm: "pad-sm", lg: "pad-lg" } },
      defaultVariants: { pad: "lg" },
    });
    const card = cva({ composes: [compact, spacious] as const });

    expectTypeOf(getSchema(card).pad.defaultValue).toEqualTypeOf<"lg">();
    expect(card()).toBe("pad-lg pad-lg");
  });
});
