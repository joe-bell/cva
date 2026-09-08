import { badge, configured, schema, type BadgeProps } from "./out/esm/esm.mjs";

export const props: BadgeProps = { tone: "warning" };
// @ts-expect-error: "danger" is not a declared tone.
export const rejected: BadgeProps = { tone: "danger" };
export const tones: readonly ("info" | "warning")[] = schema.tone.values;
export const fallback: "info" = schema.tone.defaultValue;
export const className: string = badge({ tone: "info" });
export const configuredClassName: string = configured();
