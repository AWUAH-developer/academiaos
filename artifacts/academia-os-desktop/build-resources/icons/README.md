# Desktop Build Icons

Place the following icon files here before running `pnpm dist:win`:

| File          | Format | Size          | Platform |
|---------------|--------|---------------|----------|
| `icon.ico`    | ICO    | 256×256 (multi-size) | Windows  |
| `icon.icns`   | ICNS   | 512×512      | macOS    |
| `icon.png`    | PNG    | 512×512      | Linux    |

Generate from a single 1024×1024 PNG source using electron-icon-builder:

```bash
npx electron-icon-builder --input=icon-source.png --output=./
```
