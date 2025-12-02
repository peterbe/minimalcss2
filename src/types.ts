import type { CssNode } from "css-tree";

export interface Options {
	html: string;
	css: string;
	// ignoreCSSErrors?: boolean;
	includeStatsComment?: boolean;
	removeExclamationComments?: boolean;
}

export interface Result {
	finalCSS: string;
	sizeBefore: number;
	sizeAfter: number;
	ast: CssNode;
	compressedAST: CssNode;
}
