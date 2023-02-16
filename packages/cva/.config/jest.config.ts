import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  rootDir: "../",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};

export default config;
