import { cx } from "class-variance-authority";
import { Button } from "./components";

const intents = [undefined, "primary", "secondary"] as const;
const sizes = [undefined, "medium", "small"] as const;

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
          {intents.map((intent) => (
            <th scope="col">{intent || "default"}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sizes.map((size) => (
          <tr>
            <th scope="row">{size || "default"}</th>
            {intents.map((intent) => (
              <td scope="col">
                <Button {...(intent && { intent })} {...(size && { size })}>
                  {intent || "default"} button
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;
