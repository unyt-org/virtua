import React, { useMemo } from "react";
import { Meta, StoryObj } from "@storybook/react";
import AutoSizer from "react-virtualized/dist/es/AutoSizer";
import {
  CellMeasurer,
  CellMeasurerCache,
} from "react-virtualized/dist/es/CellMeasurer";
import RVList from "react-virtualized/dist/es/List";
import { List } from "../../src";
import { ScrollInput } from "./components";

const ROW_COUNT = 1000;
const heights = [20, 40, 80, 77];
const Row = ({ index: i }: { index: number }) => {
  return (
    <div
      style={{
        height: heights[i % heights.length],
        borderBottom: "solid 1px #ccc",
        background: "#fff",
      }}
    >
      {i}
    </div>
  );
};

export default {
  component: RVList,
} as Meta;

export const DynamicHeight: StoryObj = {
  render: () => {
    const virtualizedCache = useMemo(
      () =>
        new CellMeasurerCache({
          fixedWidth: true,
          defaultHeight: 50,
        }),
      []
    );

    return (
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ flex: 1 }}>virtua</div>
          <div style={{ flex: 1 }}>react-virtualized</div>
        </div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <ScrollInput count={ROW_COUNT} />
        </div>
        <div style={{ display: "flex", flexDirection: "row", flex: 1, gap: 8 }}>
          <List style={{ flex: 1 }}>
            {Array.from({ length: ROW_COUNT }).map((_, i) => (
              <Row key={i} index={i} />
            ))}
          </List>
          <div style={{ flex: 1 }}>
            <AutoSizer>
              {({ width, height }) => (
                <RVList
                  deferredMeasurementCache={virtualizedCache}
                  width={width}
                  height={height}
                  rowCount={ROW_COUNT}
                  rowHeight={virtualizedCache.rowHeight}
                  rowRenderer={({ index: i, key, style, parent }) => (
                    <CellMeasurer
                      key={key}
                      cache={virtualizedCache}
                      columnIndex={0}
                      rowIndex={i}
                      parent={parent}
                    >
                      {({ registerChild }) => (
                        <div ref={registerChild} style={style}>
                          <Row index={i} />
                        </div>
                      )}
                    </CellMeasurer>
                  )}
                />
              )}
            </AutoSizer>
          </div>
        </div>
      </div>
    );
  },
};