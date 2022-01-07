import { syntax } from "csso";
import { parseDocument } from "htmlparser2";
import type { Document } from "domhandler";
import { selectOne } from "css-select";
import * as csstree from "css-tree";

import { postProcessOptimize } from "./post-process";
import type { Options, Result } from "./types";
export type { Options, Result };

export function minimize(options: Options): Result {
  const doc = parseDocument(options.html);

  // Parse CSS to AST
  const ast = csstree.parse(options.css);

  // To avoid costly lookup for a selector string that appears more
  // than once.
  const cache = new Map<string, boolean>();

  // Traverse AST and modify it
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
          const selectorString = csstree.generate(node);

          // If we have come across this selector string before, rely on the
          // cache Map exclusively.
          if (cache.has(selectorString)) {
            if (cache.get(selectorString)) {
              list.remove(item);
            }
          } else {
            if (!present(doc, selectorString)) {
              cache.set(selectorString, false);
              list.remove(item);
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

  // This makes it so that things like:
  //
  //    h1 { color: blue; }
  //    h1 { font-weight: bold; }
  //
  // becomes...
  //
  //    h1 { color: blue; font-weight: bold; }
  //
  const compressedAST = syntax.compress(ast).ast;

  // Walk and modify the AST now when everything's been walked at least once.
  postProcessOptimize(compressedAST);

  let finalCSS = csstree.generate(compressedAST);
  const sizeBefore = options.css.length;
  const sizeAfter = finalCSS.length;
  if (options.includeStatsComment) {
    finalCSS = `/* length before: ${sizeBefore} length after: ${sizeAfter} */\n${finalCSS}`;
  }
  return { finalCSS, sizeBefore, sizeAfter, ast, compressedAST };
}

function present(doc: Document, selector: string) {
  return selectOne(selector, doc) !== null;
}
