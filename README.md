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

## How the algorithm works

Internal caching is the key. The "trick" is to never ask the DOM more than
once for the same selector. Lookups on the DOM are considered "expensive"
and should be avoided. And any lookups previously done, might be parents
to other lookups later, so hang on to it.

Imagine this HTML:

```html
<div>
  <p>Plain text</p>
  <p>This is <b>bold</b></p>
</div>
```

and this CSS:

```css
div form,
div form input {
  color: maroon;
}
div p b,
div p em {
  color: brown;
}
```

After parsing the CSS selector, using the AST, it combutes it into
two arrays:

```js
[
  ["div", "form"],
  ["div", "form", "input"],
  ["div", "p", "b"],
  ["div", "p", "em"],
];
```

If you "flatten" those two arrays with a `' '` separator, you get:

```js
[
  "div",
  "div form",

  "div",
  "div form",
  "div form input",

  "div",
  "div p",
  "div p b",

  "div",
  "div p",
  "div p em",
];
```

Now, you can loop over this flat array and for each node, cache what the
outcome of that was:

```txt
div               Lookup made               >0 things found (1)
div form          Lookup made from (1)      0 things found (2)

div               Reuse lookup from (1)     bother to proceed
div form          Reuse lookup from (2)     don't bother to proceed because nothing from (2)
div form input    Moot!                     didn't even need to bother

div               Reuse lookup from (1)     bother to proceed
div p             Lookup made               >0 things found (3)
div p b           Lookup made from (3)      >0 things found

div               Reuse lookup from (1)     bother to proceed
div p             Reuse looup from (3)      bother to proceed
div p em          Reuse looup from (3)      0 things found
```

In total, the only time we tested a selector against something was:

1. `div`
2. `div form`
3. `p` (on `div`)
4. `b` (on `div p`)
5. `em` (on `div p`)

## Development

### Automation

The primary tool for testing is `vitest`. Install all the dependencies and
run the tests with:

```sh
npm install
npm run build
npm run test
```

The `npm run build` is an alias for `tsc` which basically means it
transpiles the `src/*.ts` code into `lib/*.d.ts`, `lib/*.js`, and
`lib/*.d.ts.map` which are the files shipped in the NPM package.

The `npm run test:vitest` is an alias for `vitest`.

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
