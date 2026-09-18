import React from "react";
import { getSchema } from "cva/tools";
import { cn } from "./cva.config";
import { Button, button } from "./components";

const schema = getSchema(button);
const intents = [undefined, ...schema.intent.values];
const sizes = [undefined, ...schema.size.values];
const isDisabled = schema.disabled.values;

export function ButtonGallery() {
  return (
    <table
      className={cn(
        "relative h-max w-max self-center justify-self-center",
        "[&_:where(th,td)]:p-2",
      )}
    >
      <caption>Button variants</caption>
      <thead>
        <tr>
          <td></td>
          <td></td>
          {intents.map((intent) => (
            <th key={intent || "default"} scope="col">
              {intent || "default"}
            </th>
          ))}
        </tr>
      </thead>
      {isDisabled.map((disabled) => (
        <tbody key={String(disabled)}>
          {sizes.map((size, index) => (
            <tr key={`${disabled}-${size || "default"}`}>
              {index === 0 && (
                <th scope="rowgroup" rowSpan={sizes.length}>
                  {disabled ? "disabled" : "enabled"}
                </th>
              )}
              <th scope="row">{size || "default"}</th>
              {intents.map((intent) => (
                <td key={intent || "default"}>
                  <Button intent={intent} size={size} disabled={disabled}>
                    {intent || "default"} button
                  </Button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
