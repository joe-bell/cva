import { cx } from "cva";
import * as Nav from "./components/nav";

// ## Option 1
//
// ```tsx
// import * as Nav from "./components/nav";
//
// const Consumer = () => (
//   <Nav.Root density="compact">
//     <Nav.Item>
//       <Nav.Link href="/home">
//         Home
//       </Nav.Link>
//     </Nav.Item>
//   </Nav.Root>
// );
// ```
//
// ## Option 2
//
// ```tsx
// import * as nav from "./components/nav";
//
// const Consumer = () => (
//   <ul className={nav.root({ density: "compact" })}>
//     <li className={nav.item()}>
//       <a className={nav.link()} href="/home">
//         Home
//       </a>
//     </li>
//   </ul>
// );
// ```

const density = ["compact", "cozy"] as const;

function App() {
  return (
    <table
      className={cx(
        "relative",
        "h-max w-max",
        "self-center justify-self-center",
        "[&_:where(th,td)]:p-4",
      )}
    >
      <thead>
        <tr>
          {density.map((key) => (
            <th scope="col" className="font-medium">
              {key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {density.map((key) => (
            <td key={key} scope="col">
              <div className="min-w-[10rem]">
                <Nav.Root density={key}>
                  {[0, 1, 2, 3, 4].map((_, i) => (
                    <Nav.Item>
                      <Nav.Link href="#">Item {i + 1}</Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav.Root>
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export default App;
