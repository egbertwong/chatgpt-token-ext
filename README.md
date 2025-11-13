# chatgpt-token-ext

Lightweight browser extension for inspecting and managing ChatGPT session tokens and request metadata. Useful for debugging, development, and analytics when working with ChatGPT-based integrations.

## Features
- View current ChatGPT session/token information
- Inspect outgoing requests and headers
- Copy token or request data to clipboard
- Lightweight UI with fast search/filter
- Works as an unpacked extension for Chromium-based browsers

## Requirements
- Node.js 14+ (recommend 16+)
- npm or yarn
- Chromium-based browser (Chrome, Edge, Brave) for loading unpacked extensions

## Quick Start

Clone the repo:
```bash
git clone https://github.com/your-org/chatgpt-token-ext.git
cd chatgpt-token-ext
```

Install dependencies:
```bash
npm install
# or
yarn
```

Build:
```bash
npm run build
# or
yarn build
```

Load unpacked extension in Chrome:
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` (or `build/`) folder produced by the build step

For development with live reload (if provided by the project):
```bash
npm run dev
# or
yarn dev
```

## Usage
- Open the extension UI from the browser toolbar.
- Observe token and request metadata listed in the panel.
- Use search/filter to find specific requests.
- Click actions to copy token or export request details.

## Development
- Lint:
```bash
npm run lint
```
- Run tests:
```bash
npm test
```
- Conventions: follow the repo's ESLint and Prettier rules. Create feature branches and open pull requests for review.

## Contributing
- Fork the repository
- Create a feature branch: `git checkout -b feat/your-feature`
- Commit changes and push to your fork
- Open a PR describing the change and any migration steps

Please respect secure handling of tokens: do not commit secrets or real tokens to source control.

## License
MIT License — see LICENSE file.

## Acknowledgements
Built with common open-source tooling. Contributions welcome.
