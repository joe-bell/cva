import invariant from "tiny-invariant";
import { config, PROJECT } from "../../theme.config";
import styles from "./StackBlitz.module.css";

interface StackBlitzProps {
  dir?: string;
  file?: string;
}

export const StackBlitz: React.FC<StackBlitzProps> = ({ dir, file }) => {
  // We need to throw instead of rely on types (because MDX)
  invariant(dir, "No directory specified");
  invariant(file, "No file specified");

  return (
    <div className={styles.root}>
      <a href={`${PROJECT}/tree/${config.branch}/${dir}/${file}`}>
        View on GitHub <span aria-label="External">↗</span>
      </a>
      <iframe
        style={{ aspectRatio: 1 / 1, width: "100%" }}
        src={`https://stackblitz.com/github/${config.repo}/tree/${config.branch}/${dir}?embed=1&file=${file}&hideNavigation=1&view=preview`}
      ></iframe>
    </div>
  );
};
