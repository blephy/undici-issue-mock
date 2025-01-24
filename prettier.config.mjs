export default {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    jsxSingleQuote: false,
    trailingComma: 'all',
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'always',
    requirePragma: false,
    insertPragma: false,
    proseWrap: 'preserve',
    htmlWhitespaceSensitivity: 'css',
    endOfLine: 'lf',
    embeddedLanguageFormatting: 'auto',
    singleAttributePerLine: false,
    xmlSelfClosingSpace: true,
    xmlWhitespaceSensitivity: 'ignore',
    overrides: [
      {
        files: ['**/*.json', '**/*.jsonc', '**/*.json5'],
        options: {
          trailingComma: 'none',
        },
      },
    ],
  };
  