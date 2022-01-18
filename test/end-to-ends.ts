import fs from "fs";
import path from "path";

import { minimize } from "../src";

describe("End-to-ends", () => {
  const rt = "test/fixtures";
  const fixtures = fs.readdirSync(rt).map((name) => path.join(rt, name));

  for (const fixture of fixtures) {
    it(`should cope with <${path.basename(fixture)}>`, () => {
      const html = fs.readFileSync(path.join(fixture, "html.html"), "utf-8");
      const css = fs.readFileSync(path.join(fixture, "css.css"), "utf-8");
      console.time(path.basename(fixture));
      const { finalCSS, sizeBefore, sizeAfter } = minimize({ html, css });
      console.timeEnd(path.basename(fixture));
      expect(sizeAfter < sizeBefore).toBeTruthy();
      expect(finalCSS).toBeTruthy();
    });
  }
});
