// deno-lint-ignore-file no-explicit-any
import {
	UPDATE_SCROLL_END_EVENT,
	UPDATE_VIRTUAL_STATE,
	createVirtualStore,
	ACTION_ITEMS_LENGTH_CHANGE,
	UPDATE_SCROLL_EVENT,
  type VirtualStore,
} from "../core/store.ts";
import { createWindowResizer, type GridResizer } from "../core/resizer.ts";
import { createWindowScroller, type Scroller } from "../core/scroller.ts";
import { ListItem } from "./ListItem.tsx";
import { getKey, isSameRange } from "./utils.ts";
import { ItemsRange, ScrollToIndexOpts } from "../core/types.ts";
import { Component } from "uix/components/Component.ts";

export interface WindowVirtualizerHandle {
	/**
	 * Find the start index of visible range of items.
	 */
	findStartIndex: () => number;
	/**
	 * Find the end index of visible range of items.
	 */
	findEndIndex: () => number;
	/**
	 * Scroll to the item specified by index.
	 * @param index index of item
	 * @param opts options
	 */
	scrollToIndex(index: number, opts?: ScrollToIndexOpts): void;
}


@template(async function(props) {
	const isHorizontal = props.horizontal;
	const store = createVirtualStore(
		props.data.length,
		props.itemSize,
		props.overscan,
		undefined,
		undefined,
		!props.itemSize
	);
	const resizer = createWindowResizer(store, isHorizontal);
	const scroller = createWindowScroller(store, isHorizontal);

	const rerender = store._getStateVersion();
	this.unsubscribeStore = store._subscribe(UPDATE_VIRTUAL_STATE, () => {
		// @ts-ignore $
		rerender.val = store._getStateVersion();
	});

	this.unsubscribeOnScroll = store._subscribe(UPDATE_SCROLL_EVENT, () => {
		props.onScroll?.(store._getScrollOffset());
	});
	this.unsubscribeOnScrollEnd = store._subscribe(
		UPDATE_SCROLL_END_EVENT, () => {
			props.onScrollEnd?.();
		}
	);

	let prev: Readonly<[number, number]> | undefined = undefined;
	const range = always<ItemsRange>(() => {
		val(rerender);
		const next = store._getRange();
		if (prev && isSameRange(prev, next)) {
			return prev;
		}
		prev = next;
		return next;
	});
	const isScrolling = always(() => val(rerender) && store._isScrolling() || false);
	const totalSize = always(() => val(rerender) && store._getTotalSize());
	const jumpCount = always(() => val(rerender) && store._getJumpCount());

	let initData = false;
	effect(() => {
		if (!initData) return;
		initData = true;
		const count = val(props.data).length;
		console.log("data did change", count);
		store._update(ACTION_ITEMS_LENGTH_CHANGE, [count, props.shift]);
	});

	let initJump = false;
	effect(() => {
		if (!initJump) return;
		initJump = true;
		const count = val(jumpCount);
		console.log("jumpCount did change", count);
		scroller._fixScrollJump();
	});


	const observeItem = resizer._observeItem;

	let index=0;
	const map = new Map<number, HTMLElement>();
	const items = await asyncAlways(async () => {
		range[0]; // Trigger
		const _index = ++index;
		// console.log(range)
		await sleep(0);
		if (_index !== index)
			return;
		const [startIndex, endIndex] = val(range);
		const items = [];
		for (let i = startIndex, j = endIndex; i <= j; i++) {
			if (map.has(i)) {
					items.push(map.get(i)!);
			} else {
				const e = props.slots ? props.slots(props.data![i]!, i) : props.nodes?.[i];
				const key = getKey(e as any, i) as string;
				const item = <ListItem
					key={key}
					rerender={rerender}
					store={store}
					resizer={observeItem}
					index={i}
					children={e}
					isHorizontal={isHorizontal}
					as={props.item ?? "div"}
				/> as HTMLElement;
				items.push(item);
				map.set(i, item);
			}
		}
		return items;
	});

	return (
		<div
			id="container"
			style={{
				// contain: "content",
				overflowAnchor: "none", // opt out browser's scroll anchoring because it will conflict to scroll anchoring of virtualizer
				flex: "none", // flex style can break layout
				position: "relative",
				visibility: "hidden", // TODO replace with other optimization methods
				width: isHorizontal ? val(totalSize) + "px" : "100%",
				height: isHorizontal ? "100%" : val(totalSize) + "px",
				pointerEvents: val(isScrolling) ? "none" : "",
			}}>
			{items}
		</div>
	)
})
export class WindowVirtualizer<T = any> extends Component<{
	data: T[];
	overscan: number;
	itemSize?: number;
	shift: boolean,
	horizontal: boolean;
	startMargin?: number,
	ssrCount?: number;
	scrollRef?: HTMLElement;
	as?: string;
	item?: keyof JSX.IntrinsicElements;
	nodes?: ChildNode[];
	slots?: (...args: unknown[]) => HTMLElement;
	onScroll?: (offset: number) => void;
	onScrollEnd?: () => void;
}> implements WindowVirtualizerHandle {
	store!: VirtualStore;
	scroller!: Scroller;
	resizer!: GridResizer;
	@id container!: HTMLElement;

	protected override onDisplay(): void | Promise<void> {
		this.resizer._observeRoot(this.container);
		this.scroller._observe(this.container);
	}

	private unsubscribeStore?: () => void;
	private unsubscribeOnScroll?: () => void;
	private unsubscribeOnScrollEnd?: () => void;

	findStartIndex() {
		return this.store._findStartIndex()
	}
	findEndIndex() {
		return this.store._findEndIndex();
	}
	scrollToIndex(index: number, opts?: ScrollToIndexOpts) {
		return this.scroller._scrollToIndex(index, opts);
	}

	protected override onRemove(): void {
		this.unsubscribeStore?.();
		this.unsubscribeOnScroll?.();
		this.unsubscribeOnScrollEnd?.();
		this.resizer._dispose();
		this.scroller._dispose();
	}
}