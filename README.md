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

- [**Stitches**](https://stitches.dev/) ([WorkOS](https://workos.com))  
  Huge thanks to the WorkOS team for pioneering the `variants` API movement – your open-source contributions are immensely appreciated
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

### Aliasing

1. Alias the package with [`npm install`](https://docs.npmjs.com/cli/v6/commands/npm-install)

   ```sh
   npm i cva@npm:class-variance-authority
   ```

2. Then import like so:

   ```ts
   import { cva } from "cva";

   // …
   ```

</details>

### Tailwind CSS IntelliSense

If you're using the ["Tailwind CSS IntelliSense" Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss), you can enable autocompletion inside `cva` by adding the following to your [`settings.json`](https://code.visualstudio.com/docs/getstarted/settings):

```json
{
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Getting Started

> **Disclaimer**: Although `cva` is a [**tiny**](https://bundlephobia.com/package/class-variance-authority) library, it's best to use in a SSR/SSG environment – your user probably doesn't need this JavaScript, especially for static components.

[Tru Narla](https://twitter.com/trunarla) did a wonderful overview of `cva` at Next.js Conf 2022 – you should check it out before continuing:

[![Building a design system in Next.js with Tailwind](.github/assets/youtube-trunarla.png "Watch on YouTube")](https://www.youtube.com/watch?v=T-Zv73yZ_QI)

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
  compoundVariants: [
    {
      intent: "primary",
      size: "medium",
      class: "uppercase",
      // **or** if you're a React.js user, `className` may feel more consistent:
      // className: "uppercase"
    },
  ],
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

### Compound Variants

Variants that apply when multiple other variant conditions are met.

```ts
// components/button.ts
import { cva } from "class-variance-authority";

const button = cva("…", {
  variants: {
    intent: { primary: "…", secondary: "…" },
    size: { small: "…", medium: "…" },
  },
  compoundVariants: [
    // Applied via:
    //   `button({ intent: "primary", size: "medium" })`
    {
      intent: "primary",
      size: "medium",
      class: "…",
    },
  ],
});
```

#### Targeting Multiple Variant Conditions

```ts
// components/button.ts
import { cva } from "class-variance-authority";

const button = cva("…", {
  variants: {
    intent: { primary: "…", secondary: "…" },
    size: { small: "…", medium: "…" },
  },
  compoundVariants: [
    // Applied via:
    //   `button({ intent: "primary", size: "medium" })`
    //     or
    //   `button({ intent: "secondary", size: "medium" })`
    {
      intent: ["primary", "secondary"],
      size: "medium",
      class: "…",
    },
  ],
});
```

### Additional Classes

All `cva` components provide an optional `class` **or** `className` prop, which can be used to pass additional classes to the component.

```ts
// components/button.ts
import { cva } from "class-variance-authority";

const button = cva(/* … */);

button({ class: "m-4" });
// => "…buttonClasses m-4"

button({ className: "m-4" });
// => "…buttonClasses m-4"
```

### TypeScript

#### `VariantProps`

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

#### Required Variants

To keep the API small and unopionated, `cva` doesn't offer a built-in solution for setting required variants.

Instead, we recommend using TypeScript's [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html):

```ts
// components/button.ts
import { cva, type VariantProps } from "class-variance-authority";

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
export const buttonVariants = cva("…", {
  variants: {
    optional: { a: "…", b: "…" },
    required: { a: "…", b: "…" },
  },
});

/**
 * Button
 */
export interface ButtonProps
  extends Omit<ButtonVariantProps, "required">,
    Required<Pick<ButtonVariantProps, "required">> {}

export const button = (props: ButtonProps) => buttonVariants(props);

// ❌ TypeScript Error:
// Argument of type "{}": is not assignable to parameter of type "ButtonProps".
//   Property "required" is missing in type "{}" but required in type
//   "ButtonProps".
button({});

// ✅
button({ required: "a" });
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
   - `defaultVariants`: set default values for previously defined variants.  
     _note: these default values can be removed completely by setting the variant as `null`_

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
  <summary>Astro</summary>

```astro
---
import { cva, type VariantProps } from "class-variance-authority";

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
});

interface Props extends VariantProps<typeof button> {}

/**
 * For Astro components, we recommend setting your defaultVariants within
 * Astro.props (which are `undefined` by default)
 */
const { intent = "primary", size = "medium" } = Astro.props;
---

<button class={button({ intent, size })}>
  <slot />
</button>
```

</details>

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
/* button.module.css */
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
import { cva, type VariantProps } from "class-variance-authority";

import {
  base,
  primary,
  secondary,
  small,
  medium,
  primaryMedium,
} from "./button.module.css";

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
    { intent: "primary", size: "medium", className: primaryMedium },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

export interface ButtonProps
  extends React.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button: React.FC<ButtonProps> = ({
  className,
  intent,
  size,
  ...props
}) => <button className={button({ intent, size, className })} {...props} />;
```

</details>

<details>
    <summary>React (with Tailwind)</summary>

```tsx
// button.tsx
import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

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
  compoundVariants: [
    { intent: "primary", size: "medium", className: "uppercase" },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

export interface ButtonProps
  extends React.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button: React.FC<ButtonProps> = ({
  className,
  intent,
  size,
  ...props
}) => <button className={button({ intent, size, className })} {...props} />;
```

</details>

<details>
    <summary>Svelte</summary>

```svelte
<!-- button.svelte -->
<script lang="ts">
  import { cva, type VariantProps } from "class-variance-authority";

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
<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";

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

defineProps<{
  intent: ButtonProps["intent"];
  size: ButtonProps["size"];
}>();
</script>

<template>
  <button :class="button({ intent, size })">
    <slot />
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

## FAQs

### Why Don't You Provide a `styled` API?

Long story short: it's unnecessary.

`cva` encourages you to think of components as traditional CSS classes:

- Less JavaScript is better
- They're framework agnostic; truly reusable
- Polymorphism is free; just apply the class to your preferred HTML element
- Less opinionated; you're free to build components with `cva` however you'd like

<details>

  <summary>Example: Polymorphic Components</summary>

There's no `as` prop in `cva`, because HTML is free:

```diff
-- // A familiar `styled` button as a link
-- <Button as="a" href="#" variant="primary">Button as a link</Button>

++ // A `cva` button as a link
++ <a href="#" class={button({variant: "primary"})}>Button as a link</a>
```

</details>

### How Can I Create [Responsive Variants like Stitches.js](https://stitches.dev/docs/responsive-styles#responsive-variants)?

You can't.

`cva` doesn't know about how you choose to apply CSS clases, and it doesn't want to.

We recommend either:

- Showing/hiding elements with different variants, based on your preferred breakpoint.

  <details>
    <summary>Example: With Tailwind</summary>

  ```tsx
  export const Example = () => (
    <>
      <div className="hidden sm:inline-flex">
        <button className={button({ intent: "primary" })}>
          Hidden until sm
        </button>
      </div>
      <div className="inline-flex sm:hidden">
        <button className={button({ intent: "secondary" })}>
          Hidden after sm
        </button>
      </div>
    </>
  );
  ```

  </details>

- Create a bespoke variant that changes based on the breakpoint.

  _e.g. `button({ intent: "primaryUntilMd" })`_

> **Note**
>
> This is something I've been thinking about since the project's inception, and I've gone back and forth many times on the idea of building it. It's a large undertaking and brings all the complexity of supporting many different build tools and frameworks.
>
> In my experience, "responsive variants" are typically rare, and hiding/showing different elements is usually good enough to get by.
>
> To be frank, I'm probably not going to build/maintain a solution unless someone periodically gives me a thick wad of cash to do so, and even then I'd probably rather spend my free time living my life.

## License

[Apache-2.0 License](/LICENSE) © [Joe Bell](https://twitter.com/joebell_)
