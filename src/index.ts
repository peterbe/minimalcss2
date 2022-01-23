import { syntax } from "csso";
// import { parseDocument } from "htmlparser2";
// import type { Document } from "domhandler";
// import render from "dom-serializer";
// import { selectOne, selectAll } from "css-select";
// import { selectAll } from "css-select";
// import cheerio, { Cheerio, CheerioAPI, Node } from "cheerio";
import cheerio, { Cheerio, Node } from "cheerio";
import * as csstree from "css-tree";

import { postProcessOptimize } from "./post-process";
import type { Options, Result } from "./types";
export type { Options, Result };

export function minimize(options: Options): Result {
  console.time("parse");
  const $ = cheerio.load(options.html);
  console.timeEnd("parse");

  // Parse CSS to AST
  const ast = csstree.parse(options.css);

  // To avoid costly lookup for a selector string that appears more
  // than once.
  // const cache = new Map<string, Document | null>();
  const cache: Map<string, null | Cheerio<Node>> = new Map();

  let lookupsMade: string[] = [];

  // Traverse AST and modify it
  console.time("walk");
  csstree.walk(ast, {
    visit: "Rule",
    enter(node, item, list) {
      // Don't go inside keyframe At-rules.
      if (this.atrule) {
        if (csstree.keyword(this.atrule.name).basename === "keyframes") {
          // The rules inside a 'keyframes' at-rules aren't real selectors.
          // E.g.
          //
          //   @keyframes RotateSlot {
          //     3% { margin-top: -2em }
          //     from { transform: rotate(0deg)}
          //    }
          //
          // So we avoid these.
          return;
        }
      }

      if (node.prelude.type === "SelectorList") {
        node.prelude.children.forEach((node, item, list) => {
          if (node.type === "Selector") {
            const arr = getSelectorList(node);
            if (arr.length === 1) {
              if (arr[0] === "*" || !arr[0].trim()) {
                return;
              }
            }

            // const parents: string[] = [];
            // let parent = "";
            let bother = true;

            let parentDocs: null | Cheerio<Node> = null;
            const combined: string[] = [];
            for (const selector of arr) {
              if (selector === "*") {
                continue;
              }
              combined.push(selector);
              const cacheKey = combined.join(" ");

              if (!parentDocs) {
                // We're at the root

                let cached = cache.get(cacheKey);
                // `cached` is either null, no nodes, or some nodes
                if (cached === null) {
                  bother = false;
                  break;
                } else if (cached === undefined) {
                  const subDocs = $(selector);
                  lookupsMade.push(cacheKey);
                  if (!subDocs.length) {
                    bother = false;
                    cache.set(cacheKey, null);
                    break;
                  } else {
                    parentDocs = subDocs;
                    cache.set(cacheKey, subDocs);
                  }
                } else {
                  if (!cached.length) {
                    bother = false;
                    break;
                  } else {
                    parentDocs = cached;
                  }
                }
              } else {
                // We're inside 'parentDocs'

                let cached = cache.get(cacheKey);
                // `cached` is either null, no nodes, or some nodes
                if (cached === null) {
                  bother = false;
                  break;
                } else if (cached === undefined) {
                  const subDocs = $(selector, parentDocs) as Cheerio<Node>;
                  lookupsMade.push(cacheKey);
                  if (!subDocs.length) {
                    bother = false;
                    // cache.set(combined.concat(selector).join(" "), null);
                    cache.set(cacheKey, null);
                    break;
                  } else {
                    parentDocs = subDocs;
                    cache.set(cacheKey, subDocs);
                  }
                } else {
                  if (!cached.length) {
                    bother = false;
                    break;
                  } else {
                    parentDocs = cached;
                  }
                }

                // const subDocs = $(selector, parentDocs) as Cheerio<Node>;
                // if (!subDocs.length) {
                //   bother = false;
                //   // cache.set(combined.join(' '))
                //   cache.set(cacheKey, null);
                //   break;
                // } else {
                //   cache.set(cacheKey, subDocs);
                //   parentDocs = subDocs;
                // }
              }
            }

            if (!bother) {
              // console.log("DELETE", csstree.generate(node));
              list.remove(item);
              return;
            }
          }
        });

        // `node.prelude.children.isEmpty` is a getter, not a method.
        // Pretty sure it's a bug in
        // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/css-tree/index.d.ts
        // @ts-expect-error But in DefinitelyTyped for css-tree
        if (node.prelude.children.isEmpty as boolean) {
          list.remove(item);
        }
      }
    },
  });
  console.timeEnd("walk");
  // console.log(cache);
  // for (const [key, stuff] of cache.entries()) {
  //   if (stuff === null) {
  //     console.log(`KEY: '${key}'`, "never!");
  //   } else {
  //     console.log(`KEY: '${key}'`, stuff.length);
  //   }
  // }
  // console.log(
  //   "Looups made:",
  //   lookupsMade.length,
  //   new Set(lookupsMade).size,
  //   lookupsMade
  // );

  // This makes it so that things like:
  //
  //    h1 { color: blue; }
  //    h1 { font-weight: bold; }
  //
  // becomes...
  //
  //    h1 { color: blue; font-weight: bold; }
  //
  console.time("compress");
  const compressedAST = syntax.compress(ast, {
    comments: options.removeExclamationComments ? false : true,
  }).ast;
  console.timeEnd("compress");

  // Walk and modify the AST now when everything's been walked at least once.
  // console.time("postprocess");
  postProcessOptimize(compressedAST);
  // console.timeEnd("postprocess");

  console.time("finalcss");
  let finalCSS = csstree.generate(compressedAST);
  console.timeEnd("finalcss");
  const sizeBefore = options.css.length;
  const sizeAfter = finalCSS.length;
  if (options.includeStatsComment) {
    finalCSS = `/* length before: ${sizeBefore} length after: ${sizeAfter} */\n${finalCSS}`;
  }
  return { finalCSS, sizeBefore, sizeAfter, ast, compressedAST };
}

function getSelectorList(node: csstree.CssNode): string[] {
  const arr: string[] = [];
  let current = "";
  if (node.type === "Selector") {
    node.children.forEach((node) => {
      if (csstree.generate(node).trim()) {
        current += csstree.generate(node);
      } else {
        arr.push(reduceCSSSelector(current));
        current = "";
      }
    });
  }
  if (current) {
    arr.push(reduceCSSSelector(current));
  }
  return arr;
}

/**
 * Reduce a CSS selector to be without any pseudo class parts.
 * For example, from `a:hover` return `a`. And from `input::-moz-focus-inner`
 * to `input`.
 * Also, more advanced ones like `a[href^="javascript:"]:after` to
 * `a[href^="javascript:"]`.
 * The last example works too if the input was `a[href^='javascript:']:after`
 * instead (using ' instead of ").
 */
function reduceCSSSelector(selector: string): string {
  return selector.split(
    /:(?=([^"'\\]*(\\.|["']([^"'\\]*\\.)*[^"'\\]*['"]))*[^"']*$)/g
  )[0];
}
