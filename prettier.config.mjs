import * as prettierPluginOxc from "@prettier/plugin-oxc";

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  overrides: [
    {
      files: ["**/*.{js,mjs,cjs,jsx}"],
      parser: "oxc",
      plugins: [prettierPluginOxc],
    },
    {
      files: ["**/*.{ts,mts,cts,tsx}"],
      parser: "oxc-ts",
      plugins: [prettierPluginOxc],
    },
  ],
};

export default config;
