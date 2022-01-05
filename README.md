# minimalcss2

A Node library to extract the minimal (critical) CSS based on a string of
HTML and a string of CSS.

Written in TypeScript. MIT license.

## Explained by example

Best explained with a very basic example:

```js
> import { minimize } from 'minimalcss2'
> const html = `<!doctype html>
  <html>
      <head>
          <title>Example</title>
      </head>
      <body>

          <h1>Header</h1>

          <div class="ingress">
              <p>Sample text</p>
          </div>

      </body>
  </html>
  `;

> const css = `
  html { border: 0; }
  body, section { padding: 0; }
  h1, h2, h3 { color: black; }
  h1 { border: 1px solid red; }
  div.ingress p { font-weight: bold; }
  div.ingress em { font-weight: normal; }
  `;
> const { finalCSS } = minimize({ html, css })
> console.log(finalCSS)
html{border:0}body{padding:0}h1{color:#000;border:1px solid red}div.ingress p{font-weight:700}
```

Unlike other libraries like [`minimalcss`](https://github.com/peterbe/minimalcss),
which is this library's predecessor, it accomplishes the analysis by treating
the HTML as a string instead of having a headless browser (e.g. `puppeteer`)
download the HTML from a real, with JavaScript, from its DOM object.

In simplicity, it parses the CSS (as an Abstract Syntax Tree), iterates over
all the selectors (e.g. `html`, `body`, `section`, `h1`, `h2`, etc) and for
each one does a CSS lookup on the HTML, as a DOM object. Think of it as
doing `$('h2').length > 0` in jQuery. Or
`document.querySelectorAll('h2').length > 0` in the browser.

The two most important dependencies are:

- [`css-select`](https://github.com/fb55/css-select), by [Felix Böhm](https://github.com/fb55) - "A CSS selector compiler and engine"
- [`css-tree`](https://github.com/csstree/csstree), by [Roman Dvornov](https://github.com/lahmatiy) - "CSSTree is a toolset for CSS: fast detailed parser (CSS → AST), walker (AST traversal), generator (AST → CSS) and lexer"

## Development

### Automation

The primary tool for testing is `jest`. Install all the dependencies and
run the tests with:

```sh
npm install
npm run build
npm run test
npm run lint
```

The `npm run build` is an alias for `tsc` which basically means it
transpiles the `src/*.ts` code into `lib/*.d.ts`, `lib/*.js`, and
`lib/*.d.ts.map` which are the files shipped in the NPM package.

The `npm run test` is an alias for `jest`. So you can break out of that
and manually run, for example, `jest --watch --bail`.

The `npm run lint` is an alias for `eslint` and `prettier`.

### Manual

You can just write a sample script. E.g. `example.mjs` that looks like this:

```js
// import { minimize } from "minimalcss2";
import minimalcss2 from "./lib/index.js";

main();
function main() {
  const html = `<!doctype html>
    <html>
        <head>
            <title>Example</title>
        </head>
        <body>

            <h1>Header</h1>

            <div class="ingress">
                <p>Sample text</p>
            </div>

        </body>
    </html>
    `;

  const css = `
    html { border: 0; }
    body, section { padding: 0; }
    h1, h2, h3 { color: black; }
    h1 { border: 1px solid red; }
    div.ingress p { font-weight: bold; }
    div.ingress em { font-weight: normal; }
    `;

  console.log(minimalcss2.minimize({ html, css }).finalCSS);
}
```

And now you can play with that on the terminal with:

```sh
npm run build && node example.mjs
```
