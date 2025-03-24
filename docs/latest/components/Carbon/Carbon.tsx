import styles from "./Carbon.module.css";
import { useEffect, useRef } from "react";

export function Carbon() {
  const reference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reference.current) {
      reference.current.innerHTML = "";
      const s = document.createElement("script");
      s.id = "_carbonads_js";
      s.src = `//cdn.carbonads.com/carbon.js?serve=CW7IC2QE&placement=cvastyle&format=responsive`;
      reference.current.appendChild(s);
    }
  }, []);

  return <div id="carbon-container" className={styles.root} ref={reference} />;
}
