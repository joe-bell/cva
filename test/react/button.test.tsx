import { Button } from "./button";
import { render, screen } from "@testing-library/react";

describe("react simple test", () => {
  test("default variant", () => {
    render(<Button />);
    const element = screen.getByRole("button");
    expect(element.className).toEqual(
      "button bg-blue-500 text-white border-transparent hover:bg-blue-600 text-base py-2 px-4 uppercase"
    );
  });

  test("change variant", () => {
    render(<Button intent="secondary" />);
    const element = screen.getByRole("button");
    expect(element.className).toEqual(
      "button bg-white text-gray-800 border-gray-400 hover:bg-gray-100 text-base py-2 px-4"
    );
  });

  test("custom css", () => {
    render(<Button intent="secondary" size="small" className="test1 test2" />);
    const element = screen.getByRole("button");
    expect(element.className).toEqual(
      "button bg-white text-gray-800 border-gray-400 hover:bg-gray-100 text-sm py-1 px-2 test1 test2"
    );
  });
});
