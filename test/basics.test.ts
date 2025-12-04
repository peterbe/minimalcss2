import { describe, expect, test } from "vitest";

import { minimize } from "../src";
import type { Options } from "../src/types";

function getFinalCSS(options: Options) {
	return minimize(options).finalCSS;
}

describe("Basics", () => {
	test("should return a string of css", () => {
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

	test("should be able to benefit from caching", () => {
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

	test("should reduce the selectors", () => {
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
			finalCSS.includes("h1{color:#000;border:1px solid red}"),
		).toBeTruthy();
		expect(finalCSS.includes("h2")).toBeFalsy();
		expect(finalCSS.includes("h3")).toBeFalsy();
		expect(finalCSS.includes("section")).toBeFalsy();
		expect(finalCSS.includes("div.ingress p")).toBeTruthy();
		expect(finalCSS.includes("div.ingress em")).toBeFalsy();
	});

	test("should compress selectors from multiple sources", () => {
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

	// test("should ignore CSS parsing errors", () => {
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

	test("should include some stats in the final CSS", () => {
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

	test("should understand media queries", () => {
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

	test("should always remove print media queries", () => {
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

	test("should keep font-face", () => {
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

	test("should remove unused font-face", () => {
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

	test("should remove 1 unused font-face and keep 1", () => {
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
			finalCSS.includes('a[href]{font-family:Foobar,"Lato"}'),
		).toBeTruthy();
		expect(finalCSS.includes("Elseness")).toBeFalsy();
	});

	test("should keep keyframe", () => {
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
			finalCSS.includes(".SomeSelector{animation:RotateSlot"),
		).toBeTruthy();
		expect(finalCSS.includes("@keyframes RotateSlot")).toBeTruthy();
	});

	test("should remove keyframe", () => {
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

	test("should remove 1 unused keyframe and keep 1", () => {
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
			finalCSS.includes("h1{animation-duration:3s;animation-name:slidein}"),
		).toBeTruthy();
		expect(finalCSS.includes("@keyframes slidein")).toBeTruthy();
		expect(finalCSS.includes("@keyframes RotateSlot")).toBeFalsy();
	});

	test("should should look inside all possible DOM trees", () => {
		// This proves that we don't overzealously cache.
		// After finding the first `div p` and look for `i` in there,
		// we're going to get a nothing at first.
		// But, it's important to look in ALL `div p` sub-trees.
		const html = `
    <html>
      <div>
        <p>
          <b>Bold</b>
        </p>
        <p>
          <i>Italic</i>
        </p>
      </div>

    </html>
    `;
		const css = `
    div p i { color: pink }
    `;
		const finalCSS = getFinalCSS({
			html,
			css,
		});
		expect(finalCSS).toBe("div p i{color:pink}");
	});

	test("should delete inputs by type", () => {
		const html = `
    <html>
      <body>
        <form>
          <input name="text">
          <input type="password" name="password">
        </form>
      </body>
    </html>
    `;
		const css = `
    input { color: pink}
    input[type="email"],
    input[type="password"],
    input[type="search"],
    input[type="text"] {
      -webkit-appearance: none;
      -moz-appearance: none;
    }
    `;
		const finalCSS = getFinalCSS({
			html,
			css,
		});
		expect(finalCSS.includes("input{color:pink}")).toBeTruthy();
		expect(finalCSS.includes("input[type=email]")).toBeFalsy();
		expect(finalCSS.includes("input[type=password]")).toBeTruthy();
		expect(finalCSS.includes("input[type=search]")).toBeFalsy();
		expect(finalCSS.includes("input[type=text]")).toBeFalsy();
	});

	test("should not choke on escaped colons in selectors (hihi)", () => {
		const html = `
    <html>
      <body>
        <a href="#" class="hover:color-bg-accent">Link</a>
      </body>
    </html>
    `;
		const css = `
    .hover\\:color-bg-accent:hover {
      color: pink;
    }
    `;
		const finalCSS = getFinalCSS({
			html,
			css,
		});
		expect(finalCSS).toContain(".hover\\:color-bg-accent:hover{color:pink}");
	});
});
