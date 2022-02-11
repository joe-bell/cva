![CVA](/.github/assets/meta.png)

<h1 align="center">cva</h1>

<p align="center">
    <strong>C</strong>lass <a href="https://www.youtube.com/watch?v=9ZcyoZlY0aU"><strong>V</strong>ariance <strong>A</strong>uthority</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/class-variance-authority">
    <img alt="NPM Version" src="https://badgen.net/npm/v/class-variance-authority" />
  </a>
  <a href="https://www.npmjs.com/package/class-variance-authority">
    <img alt="Types Included" src="https://badgen.net/npm/types/class-variance-authority" />
  </a>
  <a href="https://bundlephobia.com/result?p=class-variance-authority">
    <img alt="Minizipped Size" src="https://img.shields.io/bundlephobia/minzip/class-variance-authority" />
  </a>
  <a href="https://github.com/joe-bell/cva/blob/main/LICENSE">
    <img alt="Apache-2.0 License" src="https://badgen.net/github/license/joe-bell/cva" />
  </a>
  <a href="https://www.npmjs.com/package/class-variance-authority">
    <img alt="NPM Downloads" src="https://badgen.net/npm/dm/class-variance-authority" />
  </a>
  <a href="https://twitter.com/joebell_">
    <img alt="Follow @joebell_ on Twitter" src="https://img.shields.io/twitter/follow/joebell_.svg?style=social&label=Follow" />
  </a>
</p>

<br />

## Introduction

CSS-in-TS libraries such as [Stitches](https://stitches.dev/docs/variants) and [Vanilla Extract](https://vanilla-extract.style/documentation/) are **fantastic** options for building type-safe UI components; taking away all the worries of class names and StyleSheet composition.

…but CSS-in-TS (or CSS-in-JS) isn't for everyone.

You may need full control over your StyleSheet output. Your job might require you to use a framework such as Tailwind CSS. You might just prefer writing your own CSS.

Creating variants with the "traditional" CSS approach can become an arduous task; manually matching classes to props and manually adding types.

`cva` aims to take those pain points away, allowing you to focus on the more fun aspects of UI development.

## Acknowledgements

- [**Stitches**](https://stitches.dev/) ([Modulz](http://modulz.app))  
  Huge thanks to the Modulz team for pioneering the `variants` API movement – your open-source contributions are immensely appreciated
- [**clb**](https://github.com/crswll/clb) ([Bill Criswell](https://github.com/crswll))  
  This project originally started out with the intention of merging into the wonderful [`clb`](https://github.com/crswll/clb) library, but after some discussion with Bill, we felt it was best to go down the route of a separate project.  
  I'm so grateful to Bill for sharing his work publicly and for getting me excited about building a type-safe variants API for classes. If you have a moment, please go and [star the project on GitHub](https://github.com/crswll/clb). Thank you Bill!
- [**Vanilla Extract**](http://vanilla-extract.style) ([Seek](https://github.com/seek-oss))

## Installation

```sh
npm i class-variance-authority
```

<details>

<summary>"Do I really have to write such a long package name for every import?"</summary>

Unfortunately, yes. Originally, the plan was the publish the package as `cva`, but this name [has been taken and marked as a "placeholder"](https://www.npmjs.com/package/cva). I've reached out to the author and NPM support, but have yet to hear back.

In the meantime, you can always alias the package for your convenience…

### Aliasing in TypeScript

1. Add the alias to your [`tsconfig.json`](https://www.typescriptlang.org/tsconfig#paths) `paths`:

   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "cva": ["node_modules/class-variance-authority"]
       }
     }
   }
   ```

2. Then import like so:

   ```ts
   import { cva } from "cva";

   // …
   ```

</details>

## Getting Started

> **Disclaimer**: Although `cva` is a [**tiny**](https://bundlephobia.com/package/class-variance-authority) library, it's best to use in a SSR/SSG environment – your user probably doesn't need this JavaScript, especially for static components.

### Your First Component

To kick things off, let's build a "basic" `button` component, using `cva` to handle our variant's classes

> **Note:** Use of Tailwind CSS is optional

```ts
// components/button.ts
import { cva } from "class-variance-authority";

const button = cva(["font-semibold", "border", "rounded"], {
  variants: {
    intent: {
      primary: [
        "bg-blue-500",
        "text-white",
        "border-transparent",
        "hover:bg-blue-600",
      ],
      // **or**
      // primary: "bg-blue-500 text-white border-transparent hover:bg-blue-600",
      secondary: [
        "bg-white",
        "text-gray-800",
        "border-gray-400",
        "hover:bg-gray-100",
      ],
    },
    size: {
      small: ["text-sm", "py-1", "px-2"],
      medium: ["text-base", "py-2", "px-4"],
    },
  },
  compoundVariants: [{ intent: "primary", size: "medium", class: "uppercase" }],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

button();
// => "font-semibold border rounded bg-blue-500 text-white border-transparent hover:bg-blue-600 text-base py-2 px-4 uppercase"

button({ intent: "secondary", size: "small" });
// => "font-semibold border rounded bg-white text-gray-800 border-gray-400 hover:bg-gray-100 text-sm py-1 px-2"
```

### Additional Classes

All `cva` components provide an optional `class` prop, which can be used to pass additional classes to the component.

```ts
// components/button.ts
import { cva } from "class-variance-authority";

const button = cva(/* … */);

button({ class: "m-4" });
// => "…buttonClasses m-4"
```

### TypeScript Helpers

`cva` offers the `VariantProps` helper to extract variant types

```ts
// components/button.ts
import type { VariantProps } from "class-variance-authority";
import { cva, cx } from "class-variance-authority";

/**
 * Button
 */
export type ButtonProps = VariantProps<typeof button>;
export const button = cva(/* … */);
```

### Composing Components

Whilst `cva` doesn't yet offer a built-in method for composing components, it does offer the tools to _extend_ components on your own terms…

For example; two `cva` components, concatenated together with `cx`:

```ts
// components/card.ts
import type { VariantProps } from "class-variance-authority";
import { cva, cx } from "class-variance-authority";

/**
 * Box
 */
export type BoxProps = VariantProps<typeof box>;
export const box = cva(["box", "box-border"], {
  variants: {
    margin: { 0: "m-0", 2: "m-2", 4: "m-4", 8: "m-8" },
    padding: { 0: "p-0", 2: "p-2", 4: "p-4", 8: "p-8" },
  },
  defaultVariants: {
    margin: 0,
    padding: 0,
  },
});

/**
 * Card
 */
type CardBaseProps = VariantProps<typeof cardBase>;
const cardBase = cva(["card", "border-solid", "border-slate-300", "rounded"], {
  variants: {
    shadow: {
      md: "drop-shadow-md",
      lg: "drop-shadow-lg",
      xl: "drop-shadow-xl",
    },
  },
});

export interface CardProps extends BoxProps, CardBaseProps {}
export const card = ({ margin, padding, shadow }: CardProps = {}) =>
  cx(box({ margin, padding }), cardBase({ shadow }));
```

## API Reference

### `cva`

Builds a `cva` component

```ts
const component = cva("base", options);
```

#### Parameters

1. `base`: the base class name (`string`, `string[]` or `null`)
1. `options` _(optional)_
   - `variants`: your variants schema
   - `compoundVariants`: variants based on a combination of previously defined variants
   - `defaultVariants`: set default values for previously defined variants

#### Returns

A `cva` component function

### `cx`

Concatenates class names

```ts
const className = cx(classes);
```

#### Parameters

- `classes`: array of classes to be concatenated

#### Returns

`string`

## Examples

> ⚠️ Warning: The examples below are purely demonstrative and haven't been tested thoroughly (yet)

<details>
  <summary>BEM</summary>

```css
/* styles.css */
.button {
  /* */
}

.button--primary {
  /* */
}
.button--secondary {
  /* */
}

.button--small {
  /* */
}
.button--medium {
  /* */
}

.button--primary-small {
  /* */
}
```

```ts
import { cva } from "class-variance-authority";

const button = cva("button", {
  variants: {
    intent: {
      primary: "button--primary",
      secondary: "button--secondary",
    },
    size: {
      small: "button--small",
      medium: "button--medium",
    },
  },
  compoundVariants: [
    { intent: "primary", size: "medium", class: "button--primary-small" },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

button();
// => "button button--primary button--medium"

button({ intent: "secondary", size: "small" });
// => "button button--secondary button--small"
```

</details>

<details>
    <summary>11ty (with Tailwind)</summary>

```js
// button.11ty.js
const { cva } = require("class-variance-authority");

// ⚠️ Disclaimer: Use of Tailwind CSS is optional
const button = cva("button", {
  variants: {
    intent: {
      primary: [
        "bg-blue-500",
        "text-white",
        "border-transparent",
        "hover:bg-blue-600",
      ],
      secondary: [
        "bg-white",
        "text-gray-800",
        "border-gray-400",
        "hover:bg-gray-100",
      ],
    },
    size: {
      small: ["text-sm", "py-1", "px-2"],
      medium: ["text-base", "py-2", "px-4"],
    },
  },
  compoundVariants: [{ intent: "primary", size: "medium", class: "uppercase" }],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

module.exports = function ({ label, intent, size }) {
  return `<button class="${button({ intent, size })}">${label}</button>`;
};
```

</details>

<details>
    <summary>React (with CSS Modules)</summary>

```css
/* button.css */
.base {
  /* */
}

.primary {
  /* */
}
.secondary {
  /* */
}

.small {
  /* */
}
.medium {
  /* */
}

.primaryMedium {
  /* */
}
```

```tsx
// button.tsx
import React from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import {
  base,
  primary,
  secondary,
  small,
  medium,
  primaryMedium,
} from "./button.css";

// ⚠️ Disclaimer: Use of Tailwind CSS is optional
const button = cva(base, {
  variants: {
    intent: {
      primary,
      secondary,
    },
    size: {
      small,
      medium,
    },
  },
  compoundVariants: [
    { intent: "primary", size: "medium", class: primaryMedium },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

export type ButtonProps = VariantProps<typeof button>;

export const Button: React.FC<ButtonProps> = ({ intent, size, ...props }) => (
  <button className={button({ intent, size })} {...props} />
);
```

</details>

<details>
    <summary>React (with Tailwind)</summary>

```tsx
// button.tsx
import React from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

// ⚠️ Disclaimer: Use of Tailwind CSS is optional
const button = cva("button", {
  variants: {
    intent: {
      primary: [
        "bg-blue-500",
        "text-white",
        "border-transparent",
        "hover:bg-blue-600",
      ],
      secondary: [
        "bg-white",
        "text-gray-800",
        "border-gray-400",
        "hover:bg-gray-100",
      ],
    },
    size: {
      small: ["text-sm", "py-1", "px-2"],
      medium: ["text-base", "py-2", "px-4"],
    },
  },
  compoundVariants: [{ intent: "primary", size: "medium", class: "uppercase" }],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

export type ButtonProps = VariantProps<typeof button>;

export const Button: React.FC<ButtonProps> = ({ intent, size, ...props }) => (
  <button className={button({ intent, size })} {...props} />
);
```

</details>

<details>
    <summary>Svelte</summary>

```svelte
<!-- button.svelte -->
<script lang="ts">
  import { cva } from "class-variance-authority";
  import type {VariantProps} from "class-variance-authority";

  const button = cva("button", {
    variants: {
      intent: {
        primary: "button--primary",
        secondary: "button--secondary",
      },
      size: {
        small: "button--small",
        medium: "button--medium",
      },
    },
    compoundVariants: [
      { intent: "primary", size: "medium", class: "button--primary-medium" },
    ],
    defaultVariants: {
      intent: "primary",
      size: "medium",
    },
  });

  type ButtonProps = VariantProps<typeof button>;

  export let intent: ButtonProps["intent"];
  export let size: ButtonProps["size"];
</script>

<button class={button({ intent, size })}><slot /></button>

<style>
  .button { /* … */ }

  .button--primary { /* … */ }
  .button--secondary { /* … */ }

  .button--small { /* … */ }
  .button--medium { /* … */ }

  .button--primary-medium { /* … */ }
</style>
```

</details>

<details>
    <summary>Vue 3</summary>

```vue
<!-- button.vue -->
<script lang="ts">
import { defineComponent } from "vue";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

const button = cva("button", {
  variants: {
    intent: {
      primary: "button--primary",
      secondary: "button--secondary",
    },
    size: {
      small: "button--small",
      medium: "button--medium",
    },
  },
  compoundVariants: [
    { intent: "primary", size: "medium", class: "button--primary-medium" },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

type ButtonProps = VariantProps<typeof button>;

export default defineComponent({
  props: ["intent" as ButtonProps["intent"], "size" as ButtonProps["size"]],
  methods: {
    button,
  },
});
</script>

<template>
  <button :class="button({ intent, size })">
    <slot></slot>
  </button>
</template>

<style>
.button {
  /* … */
}

.button--primary {
  /* … */
}
.button--secondary {
  /* … */
}

.button--small {
  /* … */
}
.button--medium {
  /* … */
}

.button--primary-medium {
  /* … */
}
</style>
```

</details>

### Other Use Cases

Although primarily designed for handling class names, at its core, `cva` is really just a fancy way of managing a string…

<details>
  <summary>Dynamic Text Content</summary>

```ts
const greeter = cva("Good morning!", {
  variants: {
    isLoggedIn: {
      true: "Here's a secret only logged in users can see",
      false: "Log in to find out more…",
    },
  },
  defaultVariants: {
    isLoggedIn: "false",
  },
});

greeter();
// => "Good morning! Log in to find out more…"

greeter({ isLoggedIn: "true" });
// => "Good morning! Here's a secret only logged in users can see"
```

</details>
