import type { Options } from "../src/types";
import { minimize } from "../src";

function getFinalCSS(options: Options) {
  return minimize(options).finalCSS;
}

describe("Basics", () => {
  it("should return a string of css", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    const css = `
    h1, h2, h3 { color: blue }
    ol, li { color: blue }
    `;
    const { finalCSS, sizeBefore, sizeAfter } = minimize({ html, css });
    expect(typeof finalCSS).toBe("string");
    expect(typeof sizeBefore).toBe("number");
    expect(typeof sizeAfter).toBe("number");
  });

  it("should be able to benefit from caching", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    const css = `
    h1, h2, h3 { color: blue }
    h2 { color: orange }
    `;
    const { finalCSS } = minimize({ html, css });
    expect(typeof finalCSS).toBe("string");
  });

  it("should reduce the selectors", () => {
    const html = `
    <!doctype html>
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
    const { finalCSS } = minimize({ html, css });
    expect(
      finalCSS.includes("h1{color:#000;border:1px solid red}")
    ).toBeTruthy();
    expect(finalCSS.includes("h2")).toBeFalsy();
    expect(finalCSS.includes("h3")).toBeFalsy();
    expect(finalCSS.includes("section")).toBeFalsy();
    expect(finalCSS.includes("div.ingress p")).toBeTruthy();
    expect(finalCSS.includes("div.ingress em")).toBeFalsy();
  });

  it("should compress selectors from multiple sources", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    const css = `
    h1 { color: blue }
    h1 { font-weight: bold }
    `;
    const { finalCSS } = minimize({ html, css });
    // check that it worked at all
    expect(finalCSS.includes("h1{")).toBeTruthy();
    expect((finalCSS.match(/h1/g) || []).length).toBe(1);
  });

  // it("should ignore CSS parsing errors", () => {
  //   const html = `
  //   <html>
  //     <h1>Header</h1>
  //   </html>
  //   `;
  //   const css = `
  //    } not valid CSS::
  //   `;
  //   // const css = `
  //   // $body {
  //   //   color: violet;
  //   // }
  //   // `;
  //   const minimal = minimize({ html, css });
  //   console.log({ minimal });
  // });

  it("should include some stats in the final CSS", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    const css = `
    h1, h2, h3 { color: blue }
    ol, li { color: blue }
    `;
    const { finalCSS, sizeBefore, sizeAfter } = minimize({
      html,
      css,
      includeStatsComment: true,
    });
    const firstLine = finalCSS.split("\n")[0];
    expect(firstLine.startsWith("/*")).toBeTruthy();
    expect(firstLine.endsWith("*/")).toBeTruthy();
    expect(firstLine.includes(`${sizeBefore}`)).toBeTruthy();
    expect(firstLine.includes(`${sizeAfter}`)).toBeTruthy();
  });

  it("should understand media queries", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="">Link</a>
    </html>
    `;
    const css = `
    @media only screen
    and (min-device-width: 414px)
    and (max-device-width: 736px)
    and (-webkit-min-device-pixel-ratio: 3) {
      a { color: red }
    }

    @media only screen
    and (min-device-width: 375px)
    and (max-device-width: 812px)
    and (-webkit-min-device-pixel-ratio: 3) {
      b { color: green }
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(finalCSS.includes("a{color:red}")).toBeTruthy();
    expect(finalCSS.includes("b{color:green}")).toBeFalsy();
  });

  it("should always remove print media queries", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="">Link</a>
    </html>
    `;
    const css = `
    @media print {
      a { color: red }
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(finalCSS).toBe("");
  });

  it("should keep font-face", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="" class="SomeSelector">Link</a>
    </html>
    `;
    const css = `
    @font-face {
      font-family: 'Lato';
      font-style: normal;
      font-weight: 400;
      src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v14/MDadn8DQ_3oT6kvnUq_2r_esZW2xOQ-xsNqO47m55DA.woff2) format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
    }

    .SomeSelector {
      font-family: 'Lato';
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(finalCSS.includes('.SomeSelector{font-family:"Lato"}')).toBeTruthy();
    expect(finalCSS.includes('@font-face{font-family:"Lato"')).toBeTruthy();
  });

  it("should remove unused font-face", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="">Link</a>
    </html>
    `;
    const css = `
    @font-face {
      font-family: "Lato";
      font-style: normal;
      font-weight: 400;
      src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v14/MDadn8DQ_3oT6kvnUq_2r_esZW2xOQ-xsNqO47m55DA.woff2) format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
    }

    div.foo {
      font-family: Lato, Helvetica;
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(finalCSS).toBe("");
  });

  it("should remove 1 unused font-face and keep 1", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="">Link</a>
    </html>
    `;
    const css = `
    @font-face {
      font-family: 'Lato';
      font-style: normal;
      font-weight: 400;
      src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v14/MDadn8DQ_3oT6kvnUq_2r_esZW2xOQ-xsNqO47m55DA.woff2) format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
    }

    @font-face {
      font-family: Elseness;
      font-style: normal;
      font-weight: 400;
    }

    a[href] {
      font-family: Foobar, 'Lato';
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(finalCSS.includes('@font-face{font-family:"Lato"')).toBeTruthy();
    expect(
      finalCSS.includes('a[href]{font-family:Foobar,"Lato"}')
    ).toBeTruthy();
    expect(finalCSS.includes("Elseness")).toBeFalsy();
  });

  it("should keep keyframe", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="" class="SomeSelector">Link</a>
    </html>
    `;
    const css = `
    @keyframes RotateSlot {
      3% { margin-top: -2em }
      from { transform: rotate(0deg)}
    }

    .SomeSelector {
      animation: RotateSlot infinite 5s linear;
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(
      finalCSS.includes(".SomeSelector{animation:RotateSlot")
    ).toBeTruthy();
    expect(finalCSS.includes("@keyframes RotateSlot")).toBeTruthy();
  });

  it("should remove keyframe", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="" class="SomeSelector">Link</a>
    </html>
    `;
    const css = `
    @keyframes RotateSlot {
      3% { margin-top: -2em }
      from { transform: rotate(0deg)}
    }

    never.heardof {
      animation: RotateSlot infinite 5s linear;
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(finalCSS).toBe("");
  });

  it("should remove 1 unused keyframe and keep 1", () => {
    const html = `
    <html>
      <h1>Header</h1>
      <a href="" class="SomeSelector">Link</a>
    </html>
    `;
    const css = `
    @keyframes RotateSlot {
      3% { margin-top: -2em }
      from { transform: rotate(0deg)}
    }

    @keyframes slidein {
      from {
        transform: translateX(0%);
      }
      to {
        transform: translateX(100%);
      }
    }

    h1 {
      animation-duration: 3s;
      animation-name: slidein;
    }
    `;
    const finalCSS = getFinalCSS({
      html,
      css,
    });
    expect(
      finalCSS.includes("h1{animation-duration:3s;animation-name:slidein}")
    ).toBeTruthy();
    expect(finalCSS.includes("@keyframes slidein")).toBeTruthy();
    expect(finalCSS.includes("@keyframes RotateSlot")).toBeFalsy();
  });
});

describe("Weirdos", () => {
  it("should cope with :before and ::after", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/::before
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/::after
    const css = `
    a::after { content: "→" }
    h1:after { text-decoration: underline }

    a::before, h1:before { content: "♥"; }
    `;
    const finalCSS = getFinalCSS({ html, css });
    expect(
      finalCSS.includes("h1:after{text-decoration:underline}")
    ).toBeTruthy();
    expect(finalCSS.includes('h1:before{content:"♥"}')).toBeTruthy();
    expect(finalCSS.includes("a:")).toBeFalsy();
  });

  it("should always keep the * selector", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    const css = `
    *,
    :after,
    :before {
      box-sizing: inherit;
    }
    html, body {
      box-sizing: border-box;
    }
    `;
    const finalCSS = getFinalCSS({ html, css });
    expect(
      finalCSS.includes("*,:after,:before{box-sizing:inherit}")
    ).toBeTruthy();
    expect(finalCSS.includes("html{box-sizing:border-box}")).toBeTruthy();
  });

  it("should throw on failing selectors", () => {
    const html = `
    <html>
      <h1>Header</h1>
    </html>
    `;
    const css = `
    💥~>+🐿 { ... }
    `;
    const trouble = () => {
      getFinalCSS({ html, css });
    };
    const log = console.log;
    console.log = jest.fn();
    expect(trouble).toThrow();
    expect(console.log).toHaveBeenCalled();
    console.log = log;
  });
});
