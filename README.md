# Better GitHub Image Diff

Adds Difference and Overlay views to image diffs in GitHub pull requests.

## Origin

This is a fork of [tiagofilipenunes/git-image-diff](https://github.com/tiagofilipenunes/git-image-diff)
by [Tiago Silva](https://github.com/tiagofilipenunes).

The extension was rewritten by [Claude](https://claude.com/claude-code) (Anthropic's AI model):

- Plain JS, CSS and HTML with no dependencies and no build step. `pixelmatch` is replaced by a built-in pixel diff.
- Works with both the classic and the new "Files changed" UI on GitHub, including Git LFS images.
- No telemetry. Settings are stored locally, and only the compared images are downloaded from GitHub, without cookies.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/serjout/git-image-diff.git
   ```

2. Open `chrome://extensions/` in Chrome.
3. Turn on `Developer mode` in the top right corner.
4. Click `Load unpacked` and select the `extension` folder inside the cloned repository.

## License

[MIT](LICENSE). Copyright (c) 2024 Tiago.
