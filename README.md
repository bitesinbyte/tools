# BitesInByte Tools

A collection of free, browser-based developer utility tools built with Blazor WebAssembly. All processing happens entirely in your browser — no data is sent to any server.

## Tools

- **JSON Formatter & Validator** — Format, minify, and validate JSON with syntax highlighting
- **YAML Schema Validator** — Validate YAML documents against JSON Schema definitions
- **JWT Decoder** — Decode and inspect JSON Web Tokens (header & payload)
- **Text / File Compare** — Compare two text inputs or uploaded files side-by-side with diff highlighting
- **Encode / Decode** — Base64 and URL encode/decode strings
- **CSV Delimiter Changer** — Upload a CSV file and convert its delimiter (e.g., comma to semicolon)
- **Cron Expression Tester** — Parse and test cron expressions with next occurrence previews
- **JSON to YAML Converter** — Convert JSON documents to YAML format
- **YAML to JSON Converter** — Convert YAML documents to JSON format

## Tech Stack

- [.NET 10](https://dotnet.microsoft.com/) — Blazor WebAssembly (client-side, PWA)
- [MudBlazor 9](https://mudblazor.com/) — Material Design component library
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Code editor (via BlazorMonaco)

## Getting Started

```bash
cd src
dotnet restore
dotnet run
```

The app will be available at `https://localhost:5001`.

## License

See [LICENSE](LICENSE) for details.
