import invariant from "tiny-invariant";
import { config } from "../theme.config";

interface StackBlitzProps {
  dir?: string;
  file?: string;
}

export const StackBlitz: React.FC<StackBlitzProps> = ({ dir, file }) => {
  // We need to throw instead of rely on types (because MDX)
  invariant(dir, "No directory specified");
  invariant(file, "No file specified");

  return (
    <iframe
      style={{ aspectRatio: 1 / 1, width: "100%" }}
      src={`https://stackblitz.com/github/${config.repo}/tree/${config.branch}/${dir}?embed=1&file=${file}&hideNavigation=1&view=preview`}
    ></iframe>
  );
};
