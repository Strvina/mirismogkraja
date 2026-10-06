import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            // The browser's own boxes can't be styled or translated.
            'no-restricted-globals': [
                'error',
                { name: 'confirm', message: "Use ask() from '@/lib/confirm'." },
                { name: 'alert', message: 'Show the message on the page instead.' },
            ],
            // A page must not rename itself once it loads: the server's title stands.
            'no-restricted-imports': [
                'error',
                { paths: [{ name: '@inertiajs/react', importNames: ['Head'], message: "Use Head from '@/components/head'." }] },
            ],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        files: ['resources/js/components/head.tsx'],
        rules: { 'no-restricted-imports': 'off' },
    },
    {
        // The browser tests and their server script run in Node, not the page.
        files: ['e2e/**', 'playwright.config.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        ignores: ['vendor', 'node_modules', 'public', 'bootstrap/ssr', 'tailwind.config.js', 'test-results', 'playwright-report'],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
