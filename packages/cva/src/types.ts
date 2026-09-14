/**
 * Copyright 2022-present Joe Bell. All rights reserved.
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

/**
 * Private authoring types shared by `./config.js` (which owns the engine and
 * the public authoring surface) and `./tools.js` (which owns `getSchema`).
 * Type-only, not a build entry, and never re-exported from a public entry
 * point: `cva/config` must not publish the authoring internals, and `cva/tools`
 * must describe the same component configuration `cva` accepts rather than an
 * approximation of it.
 */

import type { CVAComponentShape, ClassValue } from "./config.js";

// Blocks inference from a site that merely checks a type parameter.
type Uninferred<T> = [T][T extends any ? 0 : never];
export type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;

// A variant name prefixed with `_` is internal: the component still accepts
// it, but `VariantProps` and `getSchema` omit it from the public surface.
export type InternalVariantKey = `_${string}`;

export type InternalOnlyWarning =
  "cva's generic parameters are restricted to internal use only.";

type CVAComponentConfigBase<T extends ClassValue = ClassValue> = { base?: T };

// Unconstrained so it can map over the merged (local plus composed)
// variants, which is only known to be an intersection, not a
// `CVAVariantShape`.
export type CVAVariantSchema<V> = {
  [Variant in keyof V]?: StringToBoolean<keyof V[Variant]> | undefined;
};
// A single value or a list per variant. One mapped type, not a union: a
// two-arm target doubles what TypeScript tries for every entry.
type CVACompoundVariantSchema<V> = {
  [Variant in keyof V]?:
    | StringToBoolean<keyof V[Variant]>
    | StringToBoolean<keyof V[Variant]>[]
    | undefined;
};
// Named so TypeScript caches one instantiation per `(V, T)`.
type CVACompoundVariants<
  V,
  T extends ClassValue,
> = (CVACompoundVariantSchema<V> & CVAClassProp<T>)[];
export type CVAClassProp<T extends ClassValue = ClassValue> =
  | {
      class?: T;
      className?: never;
    }
  | {
      class?: never;
      className?: T;
    };

export type CVAComponentConfig<
  Config,
  Variants,
  ComposedSingle extends CVAComponentShape | undefined =
    | CVAComponentShape
    | undefined,
  ComposedList extends readonly CVAComponentShape[] =
    readonly CVAComponentShape[],
  T extends ClassValue = ClassValue,
  // `defaultVariants` and `compoundVariants` are checked against local variants
  // merged with composed variants. Defaults to local variants for introspection
  // guards.
  //
  // Gate on `keyof Merged` to preserve literal defaults, and wrap in
  // `Uninferred` to prevent reverse inference from authored values.
  Merged = Variants,
> = Config & {
  composes?: ComposedSingle | readonly [...ComposedList];
  // The gate checks variant values against the configured concatenator's
  // input type, so e.g. object syntax fails here (on the `variants` key)
  // under a concatenator that doesn't accept objects.
  //
  // `__proto__` reads as a prototype write, so the gate rejects the name.
} & (Variants extends Record<string, Record<string, T>>
    ? CVAComponentConfigBase<T> & {
        variants?: Variants & { __proto__?: never };
      }
    : CVAComponentConfigBase<T> & { variants?: never }) &
  ([keyof Merged] extends [never]
    ? { compoundVariants?: never; defaultVariants?: never }
    : {
        compoundVariants?: CVACompoundVariants<Uninferred<Merged>, T>;
        defaultVariants?: CVAVariantSchema<Uninferred<Merged>>;
      });
