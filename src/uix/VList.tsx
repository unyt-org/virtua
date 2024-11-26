// deno-lint-ignore-file no-explicit-any

import { Component } from "uix/components/Component.ts";
import { InternalVirtualizer, Virtualizer, type VirtualizerHandle } from "./Virtualizer.tsx";
import type { ScrollToIndexOpts } from "../core/types.ts";
interface VListHandle extends VirtualizerHandle {}

type Props<T = any> = {
	overscan?: number,
	itemSize?: number,
	shift?: boolean,
	horizontal?: boolean,
	ssrCount?: number,
	reverse?: boolean,
	
	scroll?: (offset: number) => void,
	scrollEnd?: () => void,
} & ({
	data?: T[],
	count?: never,
} | {
	data?: never,
	count?: number
})
export const VList = blankTemplate((props: Props<any> & { children?: any }) => {
	const children = [...props.children] as JSX.Element[];
	delete props.children;
	if (typeof children.at(0) === "function") {
		if (props.data) {
			if (props.count != null)
				throw new Error("VList: count is not required when using data prop");
			return <InternalVList {...props} 
				construct={children.at(0)! as unknown as ((data: any, index: number) => Element)}
				data={props.data!}/>;
		}
		if (props.count == null)
			throw new Error("VList: count is required when using children as a function");
		return <InternalVList {...props} 
			construct={children.at(0)! as unknown as ((index: number) => Element)}
			count={props.count!}/>;
	}
	delete props.count;
	return <InternalVList {...props} items={children}/>;
});

@template(function(props) {
	const nodes = "items" in this.properties ? 
		this.properties.items :
		this.properties.construct;
	const horizontal = props.horizontal;
	const shouldReverse = props.reverse && !horizontal;

	const scrollRef = <div
		style={{
			display: horizontal ? "inline-block" : "block",
			[horizontal ? "overflowX" : "overflowY"]: "auto",
			contain: "strict",
			width: "100%",
			height: "100%",
		}}>
	</div>;

	let element = <Virtualizer
		id="handle"
		scrollRef={shouldReverse ? scrollRef : undefined}
		count={props.count}
		overscan={props.overscan}
		itemSize={props.itemSize}
		shift={props.shift ?? false}
		ssrCount={props.ssrCount}
		horizontal={horizontal ?? false}
		onScroll={props.scroll?.bind(this)}
		onScrollEnd={props.scrollEnd?.bind(this)}
		nodes={nodes}
		data={props.data}/> as Element;
	if (shouldReverse) {
		element = (
			<div
				style={{
					visibility: "hidden", // TODO replace with other optimization methods
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-end",
					minHeight: "100%",
				}}
			>
				{element}
			</div>
		);
	}
	scrollRef.append(element)
	return scrollRef;
})
class InternalVList<T = any> extends Component<Props & ({
	items?: never,
	count: number,
	construct: (index: number) => Element
} | {
	items?: never,
	data: T[],
	construct: (data: T, index: number) => Element
} | {
	construct?: never,
	items: JSX.Element[]
})> implements VListHandle {
	@id handle!: InternalVirtualizer;

	get scrollOffset() {
		return this.handle.scrollOffset;
	}
	get scrollSize() {
		return this.handle.scrollSize;
	}
	get viewportSize() {
		return this.handle.viewportSize;
	}
	findStartIndex() {
		return this.handle.findStartIndex();
	}
	findEndIndex() {
		return this.handle.findEndIndex();
	}
	getItemOffset(index: number)  {
		return this.handle.getItemOffset(index);
	}
	getItemSize(index: number) {
		return this.handle.getItemSize(index);
	}
	scrollToIndex(index: number, opts?: ScrollToIndexOpts) {
		this.handle.scrollToIndex(index, opts);
	}

	override scrollTo(offset: number): void;
	override scrollTo(x: number, y: number): void;
	override scrollTo(options: ScrollToOptions): void;
	override scrollTo(a: any, b?: any) {
		this.handle.scrollTo(a, b);
	}

	override scrollBy(offset: number): void;
	override scrollBy(x: number, y: number): void;
	override scrollBy(options: ScrollToOptions): void;
	override scrollBy(a: any, b?: any) {
		this.handle.scrollBy(a, b);
	}
}