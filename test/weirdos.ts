import { minimize } from "../src";
import type { Options } from "../src/types";

function getFinalCSS(options: Options) {
	return minimize(options).finalCSS;
}

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
			finalCSS.includes("h1:after{text-decoration:underline}"),
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
			finalCSS.includes("*,:after,:before{box-sizing:inherit}"),
		).toBeTruthy();
		expect(finalCSS.includes("html{box-sizing:border-box}")).toBeTruthy();
	});

	it("selectors with backslashes", () => {
		const html = `
      <html>
        <h1 class="md:title">Header</h1>
      </html>
      `;
		const css = `
    .md\\:title {
        font-size: 32px;
    }
    `;
		const finalCSS = getFinalCSS({ html, css });
		expect(finalCSS).toBe(".md\\:title{font-size:32px}");
	});

	// it("should throw on failing selectors", () => {
	//   const html = `
	//   <html>
	//     <h1>Header</h1>
	//   </html>
	//   `;
	//   const css = `
	//   💥~>+🐿 { ... }
	//   `;
	//   const trouble = () => {
	//     getFinalCSS({ html, css });
	//   };
	//   const log = console.log;
	//   console.log = jest.fn();
	//   expect(trouble).toThrow();
	//   expect(console.log).toHaveBeenCalled();
	//   console.log = log;
	// });
});
