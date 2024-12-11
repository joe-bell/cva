<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cva, type VariantProps } from "cva";

  const button = cva({
    base: "button",
    variants: {
      intent: {
        primary: "primary",
        secondary: "secondary",
      },
      size: {
        small: "small",
        medium: "medium",
      },
      disabled: {
        false: "enabled",
        true: "disabled",
      },
    },
    compoundVariants: [
      { intent: "primary", size: "medium", class: "primaryMedium" },
    ],
  });

  interface $$Props extends HTMLButtonAttributes, Omit<VariantProps<typeof button>, 'disabled'> {}

  /**
   * For Svelte components, we recommend setting your defaultVariants within
   * Svelte props (which are `undefined` by default)
   */
  export let intent: $$Props["intent"] = "primary";
  export let size: $$Props["size"] = "medium";
  export let disabled: $$Props["disabled"] = false;
</script>

<button
  {...$$props}
  class={button({ intent, size, disabled: disabled ?? false, class: $$props.class })}
  {disabled}
>
  <slot />
</button>

<style>
  .button {
    display: inline-flex;
    border-width: 1px;
    border-style: solid;
  }

  .primary {
    color: rgb(255 255 255);
    background-color: rgb(59 130 246);
    border: transparent;
  }

  .primary.enabled:hover {
    background-color: rgb(37 99 235);
  }

  .secondary {
    background-color: rgb(255 255 255);
    color: rgb(31 41 55);
    border-color: rgb(156 163 175);
  }

  .secondary.enabled:hover {
    background-color: rgb(243 244 246);
  }

  .small {
    font-size: 0.875rem /* 14px */;
    line-height: 1.25rem /* 20px */;
    padding: 0.25rem 0.5rem;
  }

  .medium {
    font-size: 1rem /* 16px */;
    line-height: 1.5rem /* 24px */;
    padding: 0.5rem 1rem;
  }

  .primaryMedium {
    text-transform: uppercase;
  }

  .disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
