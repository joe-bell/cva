import { cva, cx } from "./";

describe("cx", () => {
  describe.each<Parameters<typeof cx>>([
    ["bg-blue-300 bg-green-300", "bg-green-300"],
    [["bg-blue-300", "bg-red-100", "bg-green-300"], "bg-green-300"],
  ])("cx(%o)", (options, expected) => {
    test(`returns ${expected}`, () => {
      expect(cx(options)).toBe(expected);
    });
  });
});

describe("cva", () => {
  expect(cva({ base: "bg-blue-300 bg-green-300" })()).toBe("bg-green-300");

  expect(cva({ base: ["bg-blue-300", "bg-red-100", "bg-green-300"] })()).toBe(
    "bg-green-300"
  );
});
