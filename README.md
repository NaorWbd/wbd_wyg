# web_wyg

Dependency-free rich text editor for Webbed WordPress plugins. It keeps the original textarea in the form, supports RTL, visual and code views, bold, underline, text size, plain-text paste, and a strict HTML allowlist.

## Browser CDN (recommended for WordPress)

Pin an exact release tag in each plugin:

```php
wp_enqueue_style(
    'web-wyg',
    'https://cdn.jsdelivr.net/gh/NaorWbd/web_wyg@v1.0.0/dist/web_wyg.css',
    [],
    '1.0.0'
);
wp_enqueue_script(
    'web-wyg',
    'https://cdn.jsdelivr.net/gh/NaorWbd/web_wyg@v1.0.0/dist/web_wyg.js',
    [],
    '1.0.0',
    true
);
```

```html
<label for="description">Description</label>
<textarea id="description" class="web-wyg" name="description"></textarea>
```

```js
WebWyg.init(document);
// Also call WebWyg.init(container) after adding editors dynamically.
// Call WebWyg.sync(form) before reading FormData or serializing a form.
```

For a Hebrew interface, pass translated labels explicitly in `WebWyg.init(scope, { labels: { bold: '...', ... } })`. Set `data-web-wyg-dir="ltr"` on a textarea when needed. The default editor direction is RTL. Host plugins can set `--web-wyg-accent`, `--web-wyg-border`, `--web-wyg-bg`, and `--web-wyg-text` on the wrapper to match their brand. The editor does not sanitize content on the server: use the host plugin's server-side HTML allowlist, such as `wp_kses()`.

Each site gets a new release only when its plugin changes the pinned tag and deploys that change. The same pinned tag should never be moved or edited. Do not use `@main` or an unversioned URL in production. A public GitHub repository is required for jsDelivr's GitHub endpoint. For installations that cannot reach the CDN, vendor the two `dist` files at the same release version into the plugin.

## GitHub Packages (npm)

The release workflow also publishes `@naorwbd/web_wyg` to GitHub Packages. That registry is for build-time npm installation and requires GitHub authentication; it is not the browser CDN. To install it in a build pipeline, configure the `@naorwbd` scope for `https://npm.pkg.github.com` and authenticate with a token that has `read:packages`.

## Releasing

1. Change the version in `package.json` and `WebWyg.version`.
2. Run `npm run check` and exercise visual/code editing in a browser.
3. Commit, tag `vX.Y.Z`, push the tag, then publish a matching GitHub release. The release workflow publishes the npm package.
4. Update the pinned URL and version in each consumer plugin, deploy that plugin to its configured target, and verify the loaded asset and editor behavior.

This package starts from the editor used in Hapiut, itself adapted from Webbed Quotes. Existing plugins do not automatically switch to this package; migrate and verify them individually.
