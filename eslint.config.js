import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import n from "eslint-plugin-n";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        plugins: { n },
        languageOptions: {
            globals: { ...globals.node },
        },
        rules: {
            "no-unused-vars": "off",
        },
    },
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
            n,
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
    {
        files: ["tests/**/*.ts"],
        languageOptions: {
            parser: tsparser,
        },
        plugins: {
            "@typescript-eslint": tseslint,
            n,
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
];
