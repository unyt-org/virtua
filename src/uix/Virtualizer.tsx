// deno-lint-ignore-file no-explicit-any
import {
	UPDATE_SCROLL_EVENT,
	UPDATE_SCROLL_END_EVENT,
	UPDATE_VIRTUAL_STATE,
	createVirtualStore,
	getScrollSize,
	type VirtualStore,
	ACTION_ITEMS_LENGTH_CHANGE,
	ACTION_START_OFFSET_CHANGE,
} from "../core/store.ts";
import { createResizer, type GridResizer } from "../core/resizer.ts";
import { createScroller, type Scroller } from "../core/scroller.ts";
import { ItemsRange, ScrollToIndexOpts } from "../core/types.ts";
import { ListItem } from "./ListItem.tsx";
import { getKey, isSameRange } from "./utils.ts";
import { microtask } from "../core/utils.ts";
import { Component } from "uix/components/Component.ts";
import type { Ref } from "unyt_core/datex_all.ts";


type Props<T = any> = {
	data?: T[] | Ref<T[]>;
	overscan?: number;
	itemSize?: number;
	shift?: boolean,
	horizontal?: boolean;
	startMargin?: number,
	ssrCount?: number;
	scrollRef?: Element;
	as?: keyof JSX.IntrinsicElements;
	item?: keyof JSX.IntrinsicElements;
	nodes?: JSX.Element[] | ((index: number) => JSX.Element) | ((data: T, index: number) => JSX.Element);
	count?: number;
	onScroll?: (offset: number) => void;
	onScrollEnd?: () => void;
}

export interface VirtualizerHandle {
	/**
	 * Get current scrollTop, or scrollLeft if horizontal: true.
	 */
	readonly scrollOffset: number;
	/**
	 * Get current scrollHeight, or scrollWidth if horizontal: true.
	 */
	readonly scrollSize: number;
	/**
	 * Get current offsetHeight, or offsetWidth if horizontal: true.
	 */
	readonly viewportSize: number;
	/**
	 * Find the start index of visible range of items.
	 */
	findStartIndex: () => number;
	/**
	 * Find the end index of visible range of items.
	 */
	findEndIndex: () => number;
	/**
	 * Get item offset from start.
	 * @param index index of item
	 */
	getItemOffset(index: number): number;
	/**
	 * Get item size.
	 * @param index index of item
	 */
	getItemSize(index: number): number;
	/**
	 * Scroll to the item specified by index.
	 * @param index index of item
	 * @param opts options
	 */
	scrollToIndex(index: number, opts?: ScrollToIndexOpts): void;
	/**
	 * Scroll to the given offset.
	 * @param offset offset from start
	 */
	scrollTo(offset: number): void;
	/**
	 * Scroll by the given offset.
	 * @param offset offset from current position
	 */
	scrollBy(offset: number): void;
}

export const Virtualizer = blankTemplate((props: Props<any> & { children?: any }) => {
	const children = [...props.children] as JSX.Element[];
	delete props.children;
	return <InternalVirtualizer {...props} nodes={props.nodes ?? children} />;
})

@template(async function(props) {
	const isSSR = !!props.ssrCount;
	const isHorizontal = props.horizontal ?? false;

	const isDynamic = !Array.isArray(props.nodes);
	const hasData = props.data !== undefined;
	const count = hasData ?
		props.data.length :
		isDynamic ? 
			props.count! :
			props.nodes.length;
	const store = createVirtualStore(
		count,
		props.itemSize,
		props.overscan,
		props.ssrCount,
		undefined,
		!props.itemSize
	);
	this.store = store;
	const resizer = createResizer(store, isHorizontal);
	const scroller = createScroller(store, isHorizontal);
	this.scroller = scroller;
	this.resizer = resizer;

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

	const holder = $({
		range: ([0, 0] as ItemsRange),
		items: ([] as HTMLElement[])
	});
	const range = holder.$.range;
	observe(rerender, () => {
		const next = store._getRange();
		if (!isSameRange(range.val, next))
			range.val = next;
	});
	
	const items = holder.$.items;
	console.log("items", items)

	const isScrolling = always(() => val(rerender) && store._isScrolling() || false);
	const totalSize = always(() => val(rerender) && store._getTotalSize());
	const jumpCount = always(() => val(rerender) && store._getJumpCount());
	const data = props.data!;
	if (hasData && '$' in data) {
		observe(data, () => {
			console.info("Data did change");
			const count = data.length;
			store._update(ACTION_ITEMS_LENGTH_CHANGE, [count, props.shift]);
			setTimeout(() => {
				// TODO WIP
				rerender.val++;
				// totalSize update and item rerender
				// console.log(data, val(range), "<--")
				// items.val = render();
			}, 10)
		}, undefined, undefined, {recursive: false, types: [0]});
	}
	
	let initMargin = false;
	effect(() => {
		if (!initMargin) return;
		initMargin = true;
		const margin = val(props.startMargin);
		store._update(ACTION_START_OFFSET_CHANGE, margin!);
	});

	let initJump = false;
	effect(() => {
		val(jumpCount); // Trigger
		if (!initJump) return;
		initJump = true;
		scroller._fixScrollJump();
	});

	const ItemElement = props.item;
	const observeItem = resizer._observeItem;
	const map = new Map<number, HTMLElement>();
	const render = () => {
		const [startIndex, endIndex] = val(range);
		// console.log("Redn")
		const items = [];
		for (let i = startIndex, j = endIndex; i <= j; i++) {
			if (map.has(i)) {
				items.push(map.get(i)!);
			} else {
				const e = isDynamic ? 
					hasData ? 
						(props.nodes as any)?.(props.data![i]!, i) :
						(props.nodes as any)?.(i) :
					props.nodes?.[i];
				const key = getKey(e as any, i) as string;
				const item = <ListItem
					key={key}
					rerender={rerender}
					store={store}
					resizer={observeItem}
					index={i}
					children={e}
					isHorizontal={isHorizontal}
					isSSR={isSSR}
					as={ItemElement}
				/> as HTMLElement;
				items.push(item);
				// map.set(i, item);
			}
		}
		return items;
	}

	observe(range, () => {
		items.val = render();
	}, undefined, undefined, { types: [0] })
	
	const ContainerElement = (props.as ?? "div") as any;
	return (
		<ContainerElement
			style={{
				overflowAnchor: "none", // opt out browser's scroll anchoring because it will conflict to scroll anchoring of virtualizer
				flex: "none", // flex style can break layout
				position: "relative",
				visibility: "hidden", // TODO replace with other optimization methods
				width: isHorizontal ? val(totalSize) + "px" : "100%",
				height: always(() => isHorizontal ? "100%" : val(totalSize) + "px"),
				pointerEvents: val(isScrolling) ? "none" : "",
			}}>
			{items}
		</ContainerElement>
	);
})
export class InternalVirtualizer<T = any> extends Component<Props<T>> implements VirtualizerHandle {
	store!: VirtualStore;
	scroller!: Scroller;
	resizer!: GridResizer;
	
	private unsubscribeStore?: () => void;
	private unsubscribeOnScroll?: () => void;
	private unsubscribeOnScrollEnd?: () => void;

	get scrollOffset() {
		return this.store._getScrollOffset();
	}
	get scrollSize() {
		return getScrollSize(this.store);
	}
	get viewportSize() {
		return this.store._getViewportSize();
	}
	findStartIndex() {
		return this.store._findStartIndex()
	}
	findEndIndex() {
		return this.store._findEndIndex();
	}
	getItemOffset(index: number) {
		return this.store._getItemOffset(index);
	}
	getItemSize(index: number) {
		return this.store._getItemSize(index);
	}
	scrollToIndex(index: number, opts?: ScrollToIndexOpts) {
		return this.scroller._scrollToIndex(index, opts);
	}
	
	override scrollTo(offset: number): void;
	override scrollTo(x: number, y: number): void;
	override scrollTo(options: ScrollToOptions): void;
	override scrollTo(...args: any[]) {
		return this.scroller._scrollTo((args[0]?.y || args[0]?.x) || (args[1] ?? args[0]));
	}

	override scrollBy(offset: number): void;
	override scrollBy(x: number, y: number): void;
	override scrollBy(options: ScrollToOptions): void;
	override scrollBy(...args: any[]) {
		return this.scroller._scrollBy((args[0]?.y || args[0]?.x) || (args[1] ?? args[0]));
	}

	protected override onDisplay(): void | Promise<void> {
		microtask(() => {
			const assignScrollableElement = (e: HTMLElement) => {
				this.resizer._observeRoot(e);
				this.scroller._observe(e);
			};
			if (this.properties.scrollRef) {
				// parent's ref doesn't exist when onMounted is called
				assignScrollableElement(this.properties.scrollRef! as HTMLElement);
			} else {
				assignScrollableElement(this.parentElement!);
			}
		});
	}

	protected override onRemove(): void {
		this.unsubscribeStore?.();
		this.unsubscribeOnScroll?.();
		this.unsubscribeOnScrollEnd?.();
		this.resizer._dispose();
		this.scroller._dispose();
	}
}