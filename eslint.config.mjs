import js from "@eslint/js";
import tseslint from "typescript-eslint";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", ".next/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  firebaseRulesPlugin.configs["flat/recommended"]
);
