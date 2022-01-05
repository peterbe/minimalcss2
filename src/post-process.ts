import * as csstree from "css-tree";
import type { CssNode } from "css-tree";

/**
 * Take in a csstree AST, mutate it and return a csstree AST.
 * The mutation is about:
 *
 *   1) Remove all keyframe declarations that are *not* mentioned
 *      by animation name.
 *   2) Remove all font-face declarations that are *not* mentioned
 *      as the font-family.
 *
 * The gist of the function is that it walks the AST, populates sets
 * that track the names of all animations and font families. Then,
 * it converts the AST to a plain object, which it mutates by filtering
 * the 'children' object.
 * Lastly it uses the csstree's fromPlainObject to return the plain
 * object back as an AST.
 * @param {Object} ast
 */
export function postProcessOptimize(ast: CssNode) {
  // First walk the AST to know which animations are ever mentioned
  // by the remaining rules.
  const activeAnimationNames = new Set();
  csstree.walk(ast, {
    visit: "Declaration",
    enter: function (declaration) {
      if (this.rule) {
        if (csstree.property(declaration.property).basename === "animation") {
          activeAnimationNames.add(
            csstree.generate(declaration.value).split(/\s+/)[0]
          );
        } else if (
          csstree.property(declaration.property).basename === "animation-name"
        ) {
          activeAnimationNames.add(csstree.generate(declaration.value));
        }
      }
    },
  });

  // This is the function we use to filter @keyframes atrules out,
  // if its name is not actively used.
  // It also filters out all `@media print` atrules.
  csstree.walk(ast, {
    visit: "Atrule",
    enter: (node, item, list) => {
      const basename = csstree.keyword(node.name).basename;
      if (node.prelude) {
        if (basename === "keyframes") {
          if (!activeAnimationNames.has(csstree.generate(node.prelude))) {
            list.remove(item);
          }
        } else if (basename === "media") {
          if (csstree.generate(node.prelude) === "print") {
            list.remove(item);
          }
        }
      }
    },
  });

  // Now figure out what font-families are at all used in the AST.
  const activeFontFamilyNames = new Set();
  csstree.walk(ast, {
    visit: "Declaration",
    enter: function (declaration) {
      if (this.rule) {
        if (csstree.property(declaration.property).name === "font-family") {
          csstree
            .generate(declaration.value)
            .split(",")
            .forEach((value) => {
              activeFontFamilyNames.add(unquoteString(value));
            });
        }
      }
    },
  });

  // Walk into every font-family rule and inspect if we uses its declarations
  csstree.walk(ast, {
    visit: "Atrule",
    enter: (atrule, atruleItem, atruleList) => {
      if (csstree.keyword(atrule.name).basename === "font-face") {
        csstree.walk(atrule, {
          visit: "Declaration",
          enter: (declaration) => {
            if (csstree.property(declaration.property).name === "font-family") {
              const name = unquoteString(csstree.generate(declaration.value));
              // was this @font-face used?
              if (!activeFontFamilyNames.has(name)) {
                atruleList.remove(atruleItem);
              }
            }
          },
        });
      }
    },
  });
}

function unquoteString(string: string) {
  const first = string.charAt(0);
  const last = string.charAt(string.length - 1);
  if (first === last && (first === '"' || first === "'")) {
    return string.substring(1, string.length - 1);
  }
  return string;
}
