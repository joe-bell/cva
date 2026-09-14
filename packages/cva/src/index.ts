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
import { clsx } from "clsx";
import { defineConfig, type CX } from "./config.js";

export type {
  AnyCX,
  ClassValue,
  ClassDictionary,
  ClassArray,
  VariantProps,
  CX,
  CXInput,
  CXOptions,
  CXReturn,
  CVAVariantShape,
  CVAComponent,
  CVAComponentShape,
  CVA,
} from "./config.js";

// Pin the preset to config's `ClassValue` alias: inferring from `clsx` would
// name clsx's own `ClassValue` in the declaration, which is not portable
// (TS2883).
export const { cva, cx } = defineConfig<CX>({ cx: clsx });
