import { create } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export const { cx, cva } = create({
  hooks: {
    "cx:done": (className) => twMerge(className),
  },
});
