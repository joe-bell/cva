import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import styles from "./button.module.css";

const button = cva(styles.base, {
  variants: {
    intent: {
      primary: styles.primary,
      secondary: styles.secondary,
    },
    size: {
      small: styles.small,
      medium: styles.medium,
    },
    disabled: {
      false: styles.enabled,
      true: styles.disabled,
    },
  },
  compoundVariants: [
    { intent: "primary", size: "medium", className: styles.primaryMedium },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
    disabled: false,
  },
});

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof button> {}

export const Button: React.FC<ButtonProps> = ({
  className,
  intent,
  size,
  disabled,
  ...props
}) => (
  <button
    className={button({ intent, size, disabled, className })}
    disabled={disabled || undefined}
    {...props}
  />
);
