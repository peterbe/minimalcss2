// import { minimize } from "./lib/index.js";
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

  //   console.log(minimize({ html, css }));
  console.log(minimalcss2.minimize({ html, css }).finalCSS);
}
