import { cx } from "class-variance-authority";
import { Button } from "./components";

const intents = [undefined, "primary", "secondary"] as const;
const sizes = [undefined, "medium", "small"] as const;
const isDisabled = [false, true] as const;

function App() {
  return (
    <table
      className={cx(
        "relative",
        "h-max w-max",
        "self-center justify-self-center",
        "[&_:where(th,td)]:p-2",
      )}
    >
      <thead>
        <tr>
          <th></th>
          <th></th>
          {intents.map((intent) => (
            <th scope="col">{intent || "default"}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isDisabled.map((disabled) =>
          sizes.map((size, index) => (
            <tr>
              {index === 0 && (
                <th scope="rowgroup" rowSpan={3}>
                  {disabled ? "disabled" : "enabled"}
                </th>
              )}
              <th scope="row">{size || "default"}</th>
              {intents.map((intent) => (
                <td scope="col">
                  <Button
                    {...(intent && { intent })}
                    {...(size && { size })}
                    {...(disabled && { disabled })}
                  >
                    {intent || "default"} button
                  </Button>
                </td>
              ))}
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

export default App;
