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

            <div class="stuff">
                <em>Sample text</em>
            </div>
            <div class="ingress">
                <p>Sample text</p>
            </div>

        </body>
    </html>
    `;

  // const css = `
  //   html { border: 0; }
  //   body, section { padding: 0; }
  //   h1, h2, h3 { color: black; }
  //   h1 { border: 1px solid red; }
  //   div.ingress p { font-weight: bold; }
  //   div.ingress em { font-weight: normal; }

  //   div>p { border: 1px solid pink }
  //   html body div.ingress p { color: pink }
  //   `;
  // const css = `
  //   body div p { color: pink }
  //   /*body div em { color: brown } */
  //   `;
  const css = `
    body div strong { color: pink }
    body div p { color: pink }
    `;

  //   console.log(minimize({ html, css }));
  console.log(minimalcss2.minimize({ html, css }).finalCSS);
}
