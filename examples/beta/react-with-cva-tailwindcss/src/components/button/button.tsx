import React from "react";
import { cva, type VariantProps } from "cva";

export const button = cva({
  base: "base:font-semibold base:border base:rounded",
  variants: {
    intent: {
      primary: "base:bg-blue-500 base:text-white base:border-transparent",
      secondary: "base:bg-white base:text-gray-800 base:border-gray-400",
    },
    size: {
      small: "base:py-1 base:px-2 base:text-sm",
      medium: "base:py-2 base:px-4 base:text-base",
    },
    disabled: {
      false: null,
      true: "opacity-50 cursor-not-allowed",
    },
  },
  compoundVariants: [
    {
      intent: "primary",
      disabled: false,
      class: "hover:bg-blue-600",
    },
    {
      intent: "secondary",
      disabled: false,
      class: "hover:bg-gray-100",
    },
    { intent: "primary", size: "medium", class: "base:uppercase" },
  ],
});

export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof button> {}

export const Button: React.FC<ButtonProps> = ({
  className,
  intent = "primary",
  size = "medium",
  disabled = false,
  ...props
}) => (
  <button
    className={button({ intent, size, disabled, className })}
    disabled={disabled}
    {...props}
  />
);
