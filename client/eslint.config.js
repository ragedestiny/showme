// ESLint reads the code without running it and flags likely mistakes.
// This follows Vite's official React starter setup.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Generated output, not our code
  { ignores: ["build"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Catches common JavaScript mistakes (undefined names, unreachable code...)
      ...js.configs.recommended.rules,
      // The rules of React hooks (useEffect dependencies and so on)
      ...reactHooks.configs.recommended.rules,
      // Unused variables are usually a forgotten step. Names starting with a
      // capital letter are skipped because they're often only used in JSX,
      // which this rule can't see.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      // Keeps instant refresh working: component files should only export components
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // A list item's key should be the item's own id, not its position.
      // React keeps each row (and anything inside it) by its key: keyed by
      // position, when the list changes a row is reused to show another item,
      // and a click aimed at it acts on the wrong one (this made the Admin
      // page approve the wrong sentence). Built in, so it matches by name:
      // key={index}, key={i}, key={idx}, also inside a `template ${string}`.
      "no-restricted-syntax": [
        "error",
        ...[
          "JSXAttribute[name.name='key'] > JSXExpressionContainer > Identifier[name=/^(i|idx|index)$/]",
          "JSXAttribute[name.name='key'] > JSXExpressionContainer > TemplateLiteral > Identifier[name=/^(i|idx|index)$/]",
        ].map((selector) => ({
          selector,
          message:
            "Key list items by their own id (e.g. key={sentence._id}), not their position in the list.",
        })),
      ],
    },
  },
  // Build scripts and the Vite config run in Node (not the browser), where
  // `process` exists
  {
    files: ["scripts/**/*.js", "vite.config.ts"],
    languageOptions: { globals: globals.node },
  },
];
