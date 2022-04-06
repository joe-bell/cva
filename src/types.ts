export type ClassValue = string | null | undefined | ClassValue[];

export interface ClassProp {
  class?: ClassValue;
}

export type OmitUndefined<T> = T extends undefined ? never : T;
export type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;
