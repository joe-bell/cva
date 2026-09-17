import React from "react";
import { cn } from "./cva.config";
import { getSchema } from "cva/tools";
import { Button, button } from "./components";

const schema = getSchema(button);
const intents = [undefined, ...schema.intent.values];
const sizes = [undefined, ...schema.size.values];
const isDisabled = schema.disabled.values;

function App() {
  return (
    <table
      className={cn(
        "relative h-max w-max self-center justify-self-center",
        "[&_:where(th,td)]:p-2",
      )}
    >
      <thead>
        <tr>
          <th></th>
          <th></th>
          {intents.map((intent) => (
            <th key={intent || "default"} scope="col">
              {intent || "default"}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isDisabled.flatMap((disabled) =>
          sizes.map((size, index) => (
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
          )),
        )}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">override</th>
          <td colSpan={intents.length + 1}>
            <Button className={cn("bg-red-500", { "text-white": true })}>
              conditional override
            </Button>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

export default App;
