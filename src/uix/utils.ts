import { NULL } from "../core/utils.ts";
import { ItemsRange } from "../core/types.ts";

/**
 * @internal
 */
export const getKey = (e: Element, i: number): string => {
	const key = e?.getAttribute("key");
	return key != NULL ? key : "_" + i;
};

/**
 * @internal
 */
export const isSameRange = (prev: ItemsRange, next: ItemsRange): boolean => {
	return prev[0] === next[0] && prev[1] === next[1];
};