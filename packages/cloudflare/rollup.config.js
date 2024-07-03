const { withNx } = require("@nx/rollup/with-nx");
const terser = require("@rollup/plugin-terser");

module.exports = withNx(
  {
    main: "./src/index.ts",
    outputPath: "../../dist/packages/cloudflare",
    tsConfig: "./tsconfig.lib.json",
    compiler: "swc",
    format: ["cjs", "esm"],
    assets: [{ input: "./packages/cloudflare", output: ".", glob: "*.md" }],
  },
  {
    plugins: [terser()],
  },
);
