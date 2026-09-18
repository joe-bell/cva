import React from "react";
import { cva, type VariantProps } from "cva";

export const button = cva({
  base: "font-semibold border rounded",
  variants: {
    intent: {
      primary: "bg-blue-500 text-white border-transparent",
      secondary: "bg-white text-gray-800 border-gray-400",
    },
    size: {
      small: "py-1 px-2 text-sm",
      medium: "py-2 px-4 text-base",
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
    { intent: "primary", size: "medium", class: "uppercase" },
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
