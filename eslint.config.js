// eslint.config.js

export default [
    {
        rules: {
            semi: "error",                              // Require semicolons
            "prefer-const": "error",                    // Use const over let when possible
            camelcase: "error",                         // Enforce camelCase naming
            "max-lines": ["error", { max: 160 }],        // Limit each file to 160 lines
            "no-var": "error",                          // Disallow var (use let or const)
            eqeqeq: "error",                            // Require strict equality operators (=== and !==)
            "no-unused-vars": "warn",                   // Warn about variables that are declared but not used
            quotes: ["error", "single"],                // Enforce the use of single quotes for strings
            indent: ["error", 2]                        // Enforce 2-space indentation
        }
    }
];