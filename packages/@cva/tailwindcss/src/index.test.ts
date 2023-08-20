import { cva, cx } from "./";

describe("cx", () => {
  describe.each<[Parameters<typeof cx>[0], ReturnType<typeof cx>]>([
    ["bg-blue-300 bg-green-300", "bg-green-300"],
    [["bg-blue-300", "bg-red-100", "bg-green-300"], "bg-green-300"],
  ])("cx(%o)", (options, expected) => {
    test(`returns ${expected}`, () => {
      expect(cx(options)).toBe(expected);
    });
  });
});

describe("cva", () => {
  describe.each<
    [Parameters<typeof cva>[0], ReturnType<ReturnType<typeof cva>>]
  >([
    [{ base: "bg-blue-300 bg-green-300" }, "bg-green-300"],
    [{ base: ["bg-blue-300", "bg-red-100", "bg-green-300"] }, "bg-green-300"],
  ])("cva(%o)", (options, expected) => {
    test(`returns ${expected}`, () => {
      expect(cva(options)()).toBe(expected);
    });
  });
});
