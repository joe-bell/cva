export type ClassPropKey = "class" | "className";

// Type 'string | null | undefined' is not assignable to type 'undefined' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.ts(2412)
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
