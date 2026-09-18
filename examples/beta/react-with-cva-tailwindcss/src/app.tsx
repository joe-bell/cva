import React from "react";
import { cx } from "cva";
import { Button } from "./components";
import { ButtonGallery } from "./button-gallery";

function App() {
  return (
    <main className="grid justify-items-center gap-8">
      <h1 className="text-xl font-semibold">Button examples</h1>
      <ButtonGallery />
      <section className="grid justify-items-center gap-2">
        <h2 className="font-semibold">Class override</h2>
        <Button className={cx("bg-red-500", { "text-white": true })}>
          conditional override
        </Button>
      </section>
    </main>
  );
}

export default App;
