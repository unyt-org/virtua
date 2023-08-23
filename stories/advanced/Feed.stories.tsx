import { Meta, StoryObj } from "@storybook/react";
import { VList, VListHandle } from "../../src";
import React, {
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Spinner } from "../basics/components";
import { faker } from "@faker-js/faker";

export default {
  component: VList,
} as Meta;

const itemStyle: CSSProperties = {
  borderTop: "solid 1px #ccc",
  background: "#fff",
  padding: 32,
  paddingTop: 48,
  paddingBottom: 48,
  whiteSpace: "pre-wrap",
};

type TextData = {
  type: "text";
  id: number;
  value: string;
};
type ImageData = {
  type: "image";
  id: number;
  src: string;
  size: number;
};

type Data = TextData | ImageData;

const Item = ({ content }: { content: ReactNode }) => {
  return <div style={itemStyle}>{content} </div>;
};

const range = <T,>(n: number, cb: (i: number) => T) =>
  Array.from({ length: n }).map((_, i) => cb(i));

export const Default: StoryObj = {
  name: "Feed",
  render: () => {
    const id = useRef(0);
    const createItem = (): Data => {
      const rand = Math.random();
      return rand > 0.2
        ? {
            type: "text",
            id: id.current++,
            value: faker.lorem.paragraphs(Math.floor(Math.random() * 10) + 1),
          }
        : {
            type: "image",
            id: id.current++,
            src: faker.image.url(),
            size: 100 * (Math.floor(Math.random() * 4) + 1),
          };
    };
    const createItems = (num: number) => range(num, createItem);

    const [shifting, setShifting] = useState(false);
    const [startFetching, setStartFetching] = useState(false);
    const [endFetching, setEndFetching] = useState(false);
    const fetchItems = async (isStart?: boolean) => {
      if (isStart) {
        setShifting(true);
        setStartFetching(true);
      } else {
        setShifting(false);
        setEndFetching(true);
      }
      await new Promise((r) => setTimeout(r, 1000));
      if (isStart) {
        setStartFetching(false);
      } else {
        setEndFetching(false);
      }
    };

    const ref = useRef<VListHandle>(null);
    const ITEM_BATCH_COUNT = 30;
    const [items, setItems] = useState(() => createItems(ITEM_BATCH_COUNT * 2));
    const elements = useMemo(
      () =>
        items.map((d) => (
          <Item
            key={d.id}
            content={
              d.type === "image" ? <img src={d.src} height={d.size} /> : d.value
            }
          />
        )),
      [items]
    );
    const THRESHOLD = 10;
    const count = items.length;
    const startFetchedCountRef = useRef(-1);
    const endFetchedCountRef = useRef(-1);

    const ready = useRef(false);
    useEffect(() => {
      ref.current?.scrollToIndex(items.length / 2 + 1);
      ready.current = true;
    }, []);

    return (
      <VList
        ref={ref}
        style={{ flex: 1 }}
        shift={shifting ? true : false}
        onRangeChange={async (start, end) => {
          if (!ready.current) return;
          if (end + THRESHOLD > count && endFetchedCountRef.current < count) {
            endFetchedCountRef.current = count;
            await fetchItems();
            setItems((prev) => [...prev, ...createItems(ITEM_BATCH_COUNT)]);
          } else if (
            start - THRESHOLD < 0 &&
            startFetchedCountRef.current < count
          ) {
            startFetchedCountRef.current = count;
            await fetchItems(true);
            setItems((prev) => [
              ...createItems(ITEM_BATCH_COUNT).reverse(),
              ...prev,
            ]);
          }
        }}
      >
        {/* // TODO support the case when spinner is at index 0
        <Spinner
          key="head"
          style={startFetching ? undefined : { visibility: "hidden" }}
        /> */}
        {elements}
        <Spinner
          key="foot"
          style={endFetching ? undefined : { visibility: "hidden" }}
        />
      </VList>
    );
  },
};