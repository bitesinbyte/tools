# BitesInByte Tools

A collection of free, browser-based developer utility tools built with React and TypeScript. All processing happens entirely in your browser — no data is sent to any server.

## Tools

- **JSON Formatter & Validator** — Format, minify, and validate JSON with syntax highlighting
- **YAML Schema Validator** — Validate YAML documents against JSON Schema definitions
- **JWT Decoder** — Decode and inspect JSON Web Tokens (header & payload)
- **Text / File Compare** — Compare two text inputs or uploaded files side-by-side with diff highlighting
- **Encode / Decode** — Base64, URL, and HTML encode/decode strings
- **CSV Delimiter Changer** — Upload a CSV file and convert its delimiter (e.g., comma to semicolon)
- **Cron Expression Tester** — Parse and test cron expressions with next occurrence previews
- **JSON to YAML Converter** — Convert JSON documents to YAML format
- **YAML to JSON Converter** — Convert YAML documents to JSON format

## Tech Stack

- [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) — Build tool
- [MUI 9](https://mui.com/) — Material Design component library
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Code editor (via @monaco-editor/react)

## Getting Started

```bash
cd web
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Building for Production

```bash
cd web
npm run build
```

The build output will be in `web/dist`.

## License

See [LICENSE](LICENSE) for details.
