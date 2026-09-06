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

import type { CVAComponentShape, CVAVariantShape, GetSchema } from "./core.js";

export type { GetSchema } from "./core.js";

// Cast to `GetSchema`: its conditional parameter type cannot narrow here.
export const getSchema = ((component: CVAComponentShape) => {
  const variants: CVAVariantShape | undefined = component.config?.variants;
  if (!variants) return {};

  return Object.entries(variants).reduce((acc, [key, value]) => {
    if (key.startsWith("_")) return acc;

    const defaultValue = component.config.defaultVariants?.[key];
    const hasDefaultValue = defaultValue !== undefined;
    const values = Object.keys(value).map((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      // Normalize numeric-literal keys back to numbers, since that's how
      // they appear in variant prop types (`keyof { 1: ... }` is `1`, not
      // `"1"`) — object keys are always strings/symbols at runtime. The
      // `String(n) === v` round-trip only accepts canonical numeric forms
      // (so `"01"`, `""`, `" 1"` stay strings), covering negatives too.
      const n = Number(v);
      return Number.isFinite(n) && String(n) === v ? n : v;
    });
    const hasValues = values.length > 0;

    return hasValues || hasDefaultValue
      ? {
          ...acc,
          [key]: {
            ...(hasValues ? { values } : {}),
            ...(hasDefaultValue ? { defaultValue } : {}),
          },
        }
      : acc;
  }, {} as ReturnType<GetSchema>);
}) as GetSchema;
