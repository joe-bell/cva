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
 * Source-only compatibility layer. `cva/core` has never been a published entry
 * point, and this file is not a build entry: it exists so a source import of
 * `./core.js` still resolves after the implementation moved to `./config.js`
 * (and `getSchema` to `./tools.js`). Every symbol is an alias, so identities
 * and type behaviour are those of the canonical module.
 */

import {
  defineConfig as configDefineConfig,
  type AnyCX as ConfigAnyCX,
  type ClassArray as ConfigClassArray,
  type ClassDictionary as ConfigClassDictionary,
  type ClassValue as ConfigClassValue,
  type CVA as ConfigCVA,
  type CVAComponent as ConfigCVAComponent,
  type CVAComponentShape as ConfigCVAComponentShape,
  type CVAVariantShape as ConfigCVAVariantShape,
  type CX as ConfigCX,
  type CXInput as ConfigCXInput,
  type CXOptions as ConfigCXOptions,
  type CXReturn as ConfigCXReturn,
  type DefineConfig as ConfigDefineConfig,
  type DefineConfigOptions as ConfigDefineConfigOptions,
  type VariantProps as ConfigVariantProps,
} from "./config.js";
import type { GetSchema as ToolsGetSchema } from "./tools.js";

/** @deprecated Import `ClassValue` from `cva/config` instead. */
export type ClassValue = ConfigClassValue;
/** @deprecated Import `ClassDictionary` from `cva/config` instead. */
export type ClassDictionary = ConfigClassDictionary;
/** @deprecated Import `ClassArray` from `cva/config` instead. */
export type ClassArray = ConfigClassArray;
/** @deprecated Import `AnyCX` from `cva/config` instead. */
export type AnyCX = ConfigAnyCX;
/** @deprecated Import `CXInput` from `cva/config` instead. */
export type CXInput<TCX extends AnyCX> = ConfigCXInput<TCX>;
/** @deprecated Import `VariantProps` from `cva/config` instead. */
export type VariantProps<Component extends (...args: any) => any> =
  ConfigVariantProps<Component>;
/** @deprecated Import `CX` from `cva/config` instead. */
export type CX<T extends ClassValue = ClassValue> = ConfigCX<T>;
/** @deprecated Import `CXOptions` from `cva/config` instead. */
export type CXOptions = ConfigCXOptions;
/** @deprecated Import `CXReturn` from `cva/config` instead. */
export type CXReturn = ConfigCXReturn;
/** @deprecated Import `CVAVariantShape` from `cva/config` instead. */
export type CVAVariantShape = ConfigCVAVariantShape;
/** @deprecated Import `CVAComponent` from `cva/config` instead. */
export type CVAComponent<
  Config,
  Variants,
  T extends ClassValue = ClassValue,
> = ConfigCVAComponent<Config, Variants, T>;
/** @deprecated Import `CVAComponentShape` from `cva/config` instead. */
export type CVAComponentShape = ConfigCVAComponentShape;
/** @deprecated Import `CVA` from `cva/config` instead. */
export type CVA<T extends ClassValue = ClassValue> = ConfigCVA<T>;
/** @deprecated Import `DefineConfigOptions` from `cva/config` instead. */
export type DefineConfigOptions<TCX extends AnyCX = CX> =
  ConfigDefineConfigOptions<TCX>;
/** @deprecated Import `DefineConfig` from `cva/config` instead. */
export type DefineConfig = ConfigDefineConfig;
/** @deprecated Import `GetSchema` from `cva/tools` instead. */
export type GetSchema = ToolsGetSchema;

/** @deprecated Import `defineConfig` from `cva/config` instead. */
export const defineConfig: DefineConfig = configDefineConfig;
