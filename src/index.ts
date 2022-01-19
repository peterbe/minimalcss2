import { syntax } from "csso";
import { parseDocument } from "htmlparser2";
import type { Document } from "domhandler";
// import render from "dom-serializer";
// import { selectOne, selectAll } from "css-select";
import { selectAll } from "css-select";
import * as csstree from "css-tree";

import { postProcessOptimize } from "./post-process";
import type { Options, Result } from "./types";
export type { Options, Result };

export function minimize(options: Options): Result {
  const doc = parseDocument(options.html);
  // console.log(render(doc));
  // for (const inp of selectAll("input", doc)) {
  //   console.log("INP", inp);
  // }

  // Parse CSS to AST
  console.time("parse");
  const ast = csstree.parse(options.css);
  console.timeEnd("parse");

  // To avoid costly lookup for a selector string that appears more
  // than once.
  // const cache = new Map<string, Document | null>();

  // Traverse AST and modify it
  console.time("walk");
  csstree.walk(ast, {
    visit: "Rule",
    enter(node, item, list) {
      // console.log({
      //   TYPE: node.type,
      //   CSS: csstree.generate(node),
      //   PRELUDE: node.prelude,
      // });

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
        // console.log(
        //   typeof node.prelude.children,
        //   Object.keys(node.prelude.children),
        //   node.prelude.children.isEmpty()
        // );

        node.prelude.children.forEach((node, item, list) => {
          if (node.type === "Selector") {
            // node.children.prevUntil(
            //   node.children?.tail
            // )
            // console.log("selectorStringRaw::", selectorStringRaw);
            // console.log("RAW:", csstree.generate(node));

            const arr: string[] = [];
            let current = "";
            node.children.forEach((node) => {
              // console.log(
              //   "\tNODE:",
              //   { node: csstree.generate(node) },
              //   node.type
              // );
              if (csstree.generate(node).trim()) {
                current += csstree.generate(node);
              } else {
                arr.push(reduceCSSSelector(current));
                current = "";
              }
            });
            if (current) {
              arr.push(reduceCSSSelector(current));
            }
            // console.log("ARR:", arr);
            if (arr.length === 1) {
              if (arr[0] === "*" || !arr[0].trim()) {
                return;
              }
            }

            // const parents: string[] = [];
            // let parent = "";
            let bother = true;

            // let i = 0;
            let parentDocs: Document[] = [doc];
            // node.children.forEach((node) => {
            for (const selector of arr) {
              // console.log("I", i++, { bother });

              // if (!bother) return;
              const subDocs: Document[] = [];
              if (selector === "*") {
              } else {
                for (const parentDoc of parentDocs) {
                  for (const subDoc of selectAll(selector, parentDoc)) {
                    subDocs.push(subDoc);
                  }
                }
              }

              if (!subDocs.length) {
                bother = false;
                break;
              } else {
                parentDocs = subDocs;
              }

              // console.log({
              //   TYPE: node.type,
              //   STR: csstree.generate(node),
              //   PARENT: parent,
              // });

              // if (node.type === "TypeSelector") {
              //   // const selector = (parent + " " + csstree.generate(node)).trim();
              //   const selector = reduceCSSSelector(csstree.generate(node));
              //   // parentDoc = parentDoc || doc;
              //   // console.log({ selector, parent, NODE: csstree.generate(node) });

              //   // const cached = cache.get(selector);
              //   // console.log(
              //   //   `LOOK FOR ${selector} INSIDE`,
              //   //   parentDocs.map((parentDoc) => render(parentDoc)).join("--\n")
              //   // );

              //   const subDocs: Document[] = [];
              //   for (const parentDoc of parentDocs) {
              //     for (const subDoc of selectAll(selector, parentDoc)) {
              //       subDocs.push(subDoc);
              //     }
              //   }
              //   // console.log(
              //   //   subDocs.length ? "FOUND SOMETHING" : "FOUND NOTHING"
              //   // );

              //   if (!subDocs.length) {
              //     // console.log(
              //     //   "STOP GOING FURTHER",
              //     //   selector,
              //     //   "NOT FOUND IN",
              //     //   parentDocs
              //     //     .map((parentDoc) => render(parentDoc))
              //     //     .join("--\n")
              //     // );

              //     // There's no point going deeper!
              //     cache.set(selector, null);
              //     bother = false;
              //   } else {
              //     // console.log(
              //     //   "NEXT SUBDOC:",
              //     //   subDocs.map((subDoc) => render(subDoc)).join("--")
              //     // );
              //     // cache.set(parent, subDoc);
              //     parentDocs = subDocs;
              //     // parent = selector;
              //     // console.log("CACHE KEYS", Array.from(cache.keys()));
              //   }
              // } else {
              //   // parent += ' '
              // }

              // if (node.type === "WhiteSpace") {
              // parents.push(parent);
              // const selectorParentString = reduceCSSSelector(
              //     // parents.slice(-1)[0]
              //     csstree.generate(node)
              //   );
              //   console.log("CHECK", selectorParentString);
              // } else {
              //   // console.log("CHEK?", node.type, csstree.generate(node));
              // }
              // if (bother) {
              //   if (node.type === "Combinator" || node.type === "WhiteSpace") {
              //     // console.log("!!");
              //     parents.push(parent);
              //     const selectorParentString = reduceCSSSelector(
              //       parents.slice(-1)[0]
              //     );
              //     console.log("CHECK", selectorParentString);

              //     // if (cache.has(selectorParentString)) {
              //     //   if (!cache.get(selectorParentString)) {
              //     //     bother = false;
              //     //   }
              //     // } else {
              //     //   if (
              //     //     selectorParentString === "" ||
              //     //     present(doc, selectorParentString)
              //     //   ) {
              //     //     cache.set(selectorParentString, true);
              //     //   } else {
              //     //     cache.set(selectorParentString, false);
              //     //     bother = false;
              //     //   }
              //     // }

              //     // console.log("CHECK!!!", parents, parents.slice(-1));
              //     // console.log("CHECK!!!", selectorParentString);
              // parent += " ";
              //   } else {
              //     // console.log(csstree.generate(node));
              // parent += csstree.generate(node);
              //   }
              // } else {
              //   cache.set(parent, false);
              // }
            }

            // console.log("\n");

            if (!bother) {
              // console.log("DELETE", csstree.generate(node));

              list.remove(item);
              return;
            } else {
              // console.log("KEEP", csstree.generate(node));
            }

            // const selectorStringRaw = csstree.generate(node);
            // const selectorString = reduceCSSSelector(selectorStringRaw);
            // console.log({ selectorString });
            // const subDoc = selectOne(selectorString, doc);
            // console.log(!!subDoc);

            // parents.push(parent);
            // console.log("PARENTS:", parents);
            // console.log("\n");

            // while (node.children.prevUntil) {

            // }
            // console.log(
            //   node.children.forEach((x) => {
            //     console.log(x);
            //   })
            // );
          }

          // Before we begin, do a little warmup of the decision cache.
          // From a given selector, e.g. `div.foo p.bar`, we can first look
          // up if there's an point by first doing a lookup for `div.foo`
          // because if that doesn't exist we *know*  we can ignore more
          // "deeper" selectors like `div.foo p.bar` and `div.foo span a`.
          // const parentSelectors = getParentSelectors(selectorString);

          // console.log(parentSelectors);

          // // If "selectorString" was `.foo .bar span`, then
          // // this `parentSelectors` array will be
          // // `['.foo', '.foo .bar']`.
          // // If `selectorString` was just `.foo`, then
          // // this `parentSelectors` array will be `[]`.
          // let bother = true;
          // parentSelectors.forEach((selectorParentString) => {
          //   if (bother) {
          //     // Is it NOT in the decision cache?
          //     if (selectorParentString in decisionsCache === false) {
          //       decisionsCache[selectorParentString] =
          //         isSelectorMatchToAnyElement(selectorParentString);
          //     }
          //     // What was the outcome of that? And if the outcome was
          //     // that it was NOT there, set the 'bother' to false which
          //     // will popoulate the decision cache immediately.
          //     if (!decisionsCache[selectorParentString]) {
          //       bother = false;
          //       decisionsCache[selectorString] = false;
          //     }
          //   } else {
          //     decisionsCache[selectorParentString] = false;
          //   }
          // });

          // // If we have come across this selector string before, rely on the
          // // cache Map exclusively.
          // if (cache.has(selectorString)) {
          //   if (!cache.get(selectorString)) {
          //     list.remove(item);
          //   }
          // } else {
          //   if (selectorString === "" || present(doc, selectorString)) {
          //     cache.set(selectorString, true);
          //   } else {
          //     cache.set(selectorString, false);
          //     list.remove(item);
          //   }
          // }
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

  // console.time("finalcss");
  let finalCSS = csstree.generate(compressedAST);
  // console.timeEnd("finalcss");
  const sizeBefore = options.css.length;
  const sizeAfter = finalCSS.length;
  if (options.includeStatsComment) {
    finalCSS = `/* length before: ${sizeBefore} length after: ${sizeAfter} */\n${finalCSS}`;
  }
  return { finalCSS, sizeBefore, sizeAfter, ast, compressedAST };
}

// function present(doc: Document, selector: string) {
//   try {
//     // console.log("SELECTOR", selector);

//     return selectOne(selector, doc) !== null;
//   } catch (err) {
//     console.log("Error caused on:", { selector });

//     throw err;
//   }
// }

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

/**
 * Given a string CSS selector (e.g. '.foo .bar .baz') return it with the
 * last piece (split by whitespace) omitted (e.g. '.foo .bar').
 * If there is no parent, return an empty string.
 *
 * @param {string} selector
 * @return {string[]}
 */
// function getParentSelectors(selector: string): string[] {
//   const parentSelectors: string[] = [];
//   if (!selector) return parentSelectors;

//   // const selectorAst = csstree.parse(selector, { context: "selector" });

//   // console.log(selectorAst);

//   return parentSelectors;
//   // let generatedCSS;
//   // while (selectorAst.children.tail) {
//   //   selectorAst.children.prevUntil(
//   //     selectorAst.children.tail,
//   //     (node, item, list) => {
//   //       list.remove(item);
//   //       return node.type === "Combinator" || node.type === "WhiteSpace";
//   //     }
//   //   );
//   //   generatedCSS = csstree.generate(selectorAst);
//   //   if (generatedCSS) {
//   //     parentSelectors.push(generatedCSS);
//   //   }
//   // }
//   // return parentSelectors.reverse();
// }
