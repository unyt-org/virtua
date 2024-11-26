// deno-lint-ignore-file no-explicit-any
import { ItemResizeObserver } from "../core/resizer.ts";
import { isRTLDocument } from "../core/environment.ts";
import { StateVersion, VirtualStore } from "../core/store.ts";

export const ListItem = blankTemplate((props: {
	key?: string,
	rerender: StateVersion;
	store: VirtualStore;
	index: number;
	resizer: ItemResizeObserver;
	as?: keyof JSX.IntrinsicElements;
	isHorizontal: boolean;
	isSSR?: boolean;
}) => {
	const offset = always(() => 
		val(props.rerender) && props.store._getItemOffset(props.index)
	);
	const hide = always(() =>
		val(props.rerender) && props.store._isUnmeasuredItem(props.index) || false
	);

	const {
		// @ts-ignore $
		children: children,
		isHorizontal: isHorizontal,
		isSSR: isSSR,
	} = props;
	
	const ItemElement = (props.as ?? "div") as any;
	const item = <ItemElement style={{
		position: !not(hide) && isSSR ? "" : "absolute",
		[isHorizontal ? "height" : "width"]: "100%",
		[isHorizontal ? "top" : "left"]: "0px",
		[isHorizontal ? (isRTLDocument() ? "right" : "left") : "top"]: offset + "px",
		visibility: not(hide) || isSSR ? "visible" : "hidden",
		[isHorizontal ? "display" : ""]: isHorizontal ? "flex" : "",
	}}>
		{children}
	</ItemElement> as HTMLElement;
	
	effect(() => {
		// FIXME make better
		item.style.top = val(offset) + "px";
	});
	props.resizer(item!, props.index);
	return item;
})
