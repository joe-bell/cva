import { cva } from "../dist";

const buttonWithStringClasses = cva("button font-semibold border rounded", {
  variants: {
    intent: {
      primary:
        "button--primary bg-blue-500 text-white border-transparent hover:bg-blue-600",
      secondary:
        "button--secondary bg-white text-gray-800 border-gray-400 hover:bg-gray-100",
      warning:
        "button--warning bg-yellow-500 border-transparent hover:bg-yellow-600",
      danger:
        "button--danger bg-red-500 text-white border-transparent hover:bg-red-600",
    },
    disabled: {
      true: "button--disabled opacity-050 cursor-not-allowed",
      false: "button--enabled cursor-pointer",
    },
    size: {
      small: "button--small text-sm py-1 px-2",
      medium: "button--medium text-base py-2 px-4",
      large: "button--large text-lg py-2.5 px-4",
    },
  },
  compoundVariants: [
    {
      intent: "primary",
      size: "medium",
      class: "button--primary-medium uppercase",
    },
    {
      intent: "warning",
      disabled: false,
      class: "button--warning-enabled text-gray-800",
    },
    {
      intent: "warning",
      disabled: true,
      class: "button--warning-disabled text-black",
    },
  ],
  defaultVariants: {
    disabled: false,
    intent: "primary",
    size: "medium",
  },
});

buttonWithStringClasses();

const buttonWithArrayClasses = cva(
  ["button", "font-semibold", "border", "rounded"],
  {
    variants: {
      intent: {
        primary: [
          "button--primary",
          "bg-blue-500",
          "text-white",
          "border-transparent",
          "hover:bg-blue-600",
        ],
        secondary: [
          "button--secondary",
          "bg-white",
          "text-gray-800",
          "border-gray-400",
          "hover:bg-gray-100",
        ],
        warning: [
          "button--warning",
          "bg-yellow-500",
          "border-transparent",
          "hover:bg-yellow-600",
        ],
        danger: [
          "button--danger",
          "bg-red-500",
          "text-white",
          "border-transparent",
          "hover:bg-red-600",
        ],
      },
      disabled: {
        true: ["button--disabled", "opacity-050", "cursor-not-allowed"],
        false: ["button--enabled", "cursor-pointer"],
      },
      size: {
        small: ["button--small", "text-sm", "py-1", "px-2"],
        medium: ["button--medium", "text-base", "py-2", "px-4"],
        large: ["button--large", "text-lg", "py-2.5", "px-4"],
      },
    },
    compoundVariants: [
      {
        intent: "primary",
        size: "medium",
        class: ["button--primary-medium", "uppercase"],
      },
      {
        intent: "warning",
        disabled: false,
        class: ["button--warning-enabled", "text-gray-800"],
      },
      {
        intent: "warning",
        disabled: true,
        class: ["button--warning-disabled", "text-black"],
      },
    ],
    defaultVariants: {
      disabled: false,
      intent: "primary",
      size: "medium",
    },
  }
);

buttonWithArrayClasses();
