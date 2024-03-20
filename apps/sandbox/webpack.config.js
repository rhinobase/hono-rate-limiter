const { NxWebpackPlugin } = require("@nx/webpack");
const { join } = require("node:path");

module.exports = {
  output: {
    path: join(__dirname, "../../dist/apps/sandbox"),
  },
  plugins: [
    new NxWebpackPlugin({
      target: "node",
      compiler: "tsc",
      main: "./src/main.tsx",
      tsConfig: "./tsconfig.app.json",
      // assets: ["./src/assets"],
      optimization: false,
      outputHashing: "none",
    }),
  ],
};
