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
import {
  defineConfig as defineCoreConfig,
  type AnyCX,
  type CVA,
  type CXInput,
  type Compose,
  type CX,
  type DefineConfigOptions as CoreDefineConfigOptions,
} from "./core.js";
import {
  getSchema as getSchemaUtils,
  type GetSchema as UtilsGetSchema,
} from "./utils.js";

export type {
  AnyCX,
  ClassValue,
  ClassDictionary,
  ClassArray,
  VariantProps,
  Compose,
  CX,
  CXInput,
  CXOptions,
  CXReturn,
  CVAVariantShape,
  CVAComponent,
  CVAComponentShape,
  CVA,
} from "./config.js";

/** @deprecated Import `GetSchema` from `cva/utils` instead. */
export type GetSchema = UtilsGetSchema;

/** @deprecated Import `getSchema` from `cva/utils` instead. */
export const getSchema: GetSchema = getSchemaUtils;

/**
 * @deprecated Import `DefineConfigOptions` from `cva/config` instead and provide
 * the required `cx` concatenator (for example, `clsx`).
 */
export interface DefineConfigOptions<TCX extends AnyCX = CX> extends Omit<
  CoreDefineConfigOptions<TCX>,
  "cx"
> {
  /** Defaults to `clsx`. */
  cx?: CoreDefineConfigOptions<TCX>["cx"];
}

/**
 * @deprecated Import `DefineConfig` from `cva/config` instead. Its options require
 * a `cx` concatenator (for example, `clsx`).
 */
export interface DefineConfig {
  <TCX extends AnyCX = CX>(
    options?: DefineConfigOptions<TCX>,
  ): {
    /**
     * @deprecated Use the `composes` property inside `cva` instead.
     * @example
     * // Before
     * const card = compose(box, stack)
     * // After
     * const card = cva({ composes: [box, stack] })
     */
    compose: Compose<CXInput<TCX>>;
    cx: CX<CXInput<TCX>>;
    cva: CVA<CXInput<TCX>>;
  };
}

/**
 * @deprecated Import `defineConfig` from `cva/config` instead — the `cva`
 * package is the clsx preset, while `cva/config` is where custom
 * configuration (your own `cx` concatenator, hooks) lives.
 */
export const defineConfig = ((options?: DefineConfigOptions) =>
  defineCoreConfig({
    ...options,
    cx: options?.cx ?? clsx,
  })) as DefineConfig;

const preset = defineCoreConfig({ cx: clsx });

/** @deprecated Use the `composes` property inside `cva` instead. */
export const compose = preset.compose;
export const { cva, cx } = preset;
