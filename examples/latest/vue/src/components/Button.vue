<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";

const button = cva("button", {
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
      true: "disabled",
      false: "enabled",
    },
  },
  compoundVariants: [
    { intent: "primary", size: "medium", class: "primaryMedium" },
  ],
});

type ButtonProps = VariantProps<typeof button>;

withDefaults(
  defineProps<{
    intent: ButtonProps["intent"];
    size: ButtonProps["size"];
  }>(),
  {
    intent: "primary",
    size: "medium",
    // Within Vue, `disabled` is defined and included by default.
    disabled: false,
  },
);
</script>

<template>
  <button
    :class="
      button({
        intent,
        size,
        // Within Vue, `boolean` attributes will be passed through if they have
        // **truthy** values.
        // https://vuejs.org/guide/essentials/template-syntax.html#boolean-attributes
        disabled: typeof $attrs['disabled'] !== 'undefined',
      })
    "
    :disabled="typeof $attrs['disabled'] !== 'undefined'"
  >
    <slot />
  </button>
</template>

<style scoped>
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

.disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.primaryMedium {
  text-transform: uppercase;
}
</style>
