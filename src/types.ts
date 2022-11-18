export type ClassPropKey = "class" | "className";
export type ClassValue = string | null | undefined | ClassValue[];

export type ClassProp =
  | {
      class: ClassValue;
      className?: never;
    }
  | { class?: never; className: ClassValue }
  | { class?: never; className?: never };

export type OmitUndefined<T> = T extends undefined ? never : T;
export type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;

export type AddExclamationMark<T extends unknown> =
  // If T is a boolean string, don't add negation to this.
  T extends "true" | "false"
    ? T
    : // If it's a number or string, negation is supported.
    T extends string | number
    ? `!${T}`
    : // Any other type is returned as is.
      T;
