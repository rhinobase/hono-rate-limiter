const terser = require("@rollup/plugin-terser");

module.exports = (config) => ({
  ...config,
  plugins: config.plugins ? [terser(), ...config.plugins] : [],
});
