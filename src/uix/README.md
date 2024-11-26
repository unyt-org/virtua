# Virtual + UIX

## Rendering on demand
```tsx
<VList 
	itemSize={40}
	overscan={20}
	count={1000}
	style={{ height: "200px" }}>
	{
		(index: number) => (
			<div style={{ height: 40, background: "#fff" }}>
				Item #{index}
			</div> as HTMLElement
		)
	}
</VList>
```

## Rendering all
```tsx
<VList 
	itemSize={40}
	overscan={20}
	style={{ height: "200px" }}>
	{ Array.from({ length: 1000 }).map((_, index) => (
		<div style={{ height: 40, background: "#fff" }}>
			Item #{index}
		</div>
	)) }
</VList>
```

## Rendering dynamic data
```tsx
const data = $([10, 20, 30, 40]);
<VList 
	itemSize={40}
	overscan={20}
	style={{ height: "200px" }}
	data={data}>
	{
		(data: number, index: number) => (
			<div style={{ height: data, background: "#fff" }}>
				Item #{index}
			</div> as HTMLElement
		)
	}
</VList>;

data.push(50);
```