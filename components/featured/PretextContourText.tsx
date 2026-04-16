"use client";

import { layout, layoutNextLine, prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useMemo } from "react";
import type { ContourFrame, RowSpan, WrappedRowSegment } from "@/types";

interface PretextContourTextProps {
  contourFrame: ContourFrame | null;
  text: string;
  textBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize: number;
  lineHeight: number;
  onMetricsChange: (metrics: { height: number }) => void;
}

const MIN_FRAGMENT_WIDTH = 84;
const TEXT_FONT_FAMILY = 'Merriweather, Georgia, "Times New Roman", serif';

function buildFallbackRows(width: number, lineHeight: number, count: number): RowSpan[] {
  return Array.from({ length: count }, (_, rowIndex) => ({
    y: rowIndex * lineHeight,
    leftStart: 0,
    leftWidth: width,
    rightStart: 0,
    rightWidth: 0,
    isSplitRow: false,
  }));
}

export function PretextContourText({
  contourFrame,
  text,
  textBox,
  fontSize,
  lineHeight,
  onMetricsChange,
}: PretextContourTextProps) {
  const font = useMemo(
    () => `400 ${fontSize}px ${TEXT_FONT_FAMILY}`,
    [fontSize]
  );

  const prepared = useMemo(() => prepareWithSegments(text, font), [font, text]);

  const rendered = useMemo(() => {
    if (textBox.width <= 0) {
      return { segments: [] as WrappedRowSegment[], height: 0 };
    }

    const baseline = layout(prepared, textBox.width, lineHeight);
    const baseRowCount = Math.max(baseline.lineCount + 36, 72);
    const rows =
      contourFrame?.rowSpans.length && contourFrame.rowSpans.length > 0
        ? contourFrame.rowSpans
        : buildFallbackRows(textBox.width, lineHeight, baseRowCount);

    const segments: WrappedRowSegment[] = [];
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let rowIndex = 0;

    while (rowIndex < rows.length) {
      const row = rows[rowIndex];

      if (row.isSplitRow) {
        let consumed = false;

        if (row.leftWidth >= MIN_FRAGMENT_WIDTH) {
          const leftLine = layoutNextLine(prepared, cursor, row.leftWidth);
          if (leftLine) {
            segments.push({
              text: leftLine.text,
              x: row.leftStart,
              y: row.y,
              width: row.leftWidth,
              rowIndex,
              segment: "left",
            });
            cursor = leftLine.end;
            consumed = true;
          }
        }

        if (row.rightWidth >= MIN_FRAGMENT_WIDTH) {
          const rightLine = layoutNextLine(prepared, cursor, row.rightWidth);
          if (rightLine) {
            segments.push({
              text: rightLine.text,
              x: row.rightStart,
              y: row.y,
              width: row.rightWidth,
              rowIndex,
              segment: consumed ? "right" : "full",
            });
            cursor = rightLine.end;
            consumed = true;
          }
        }

        if (!consumed) {
          rowIndex += 1;
          continue;
        }
      } else {
        const usesFullRow = row.rightWidth === 0 && Math.abs(row.leftWidth - textBox.width) < 1;
        const width = usesFullRow ? textBox.width : Math.max(row.leftWidth, row.rightWidth || 0);
        const x = usesFullRow || row.leftWidth >= row.rightWidth ? row.leftStart : row.rightStart;

        if (width < MIN_FRAGMENT_WIDTH) {
          rowIndex += 1;
          continue;
        }

        const line = layoutNextLine(prepared, cursor, width);

        if (line) {
          segments.push({
            text: line.text,
            x,
            y: row.y,
            width,
            rowIndex,
            segment: "full",
          });
          cursor = line.end;
        }
      }

      const nextLine = layoutNextLine(prepared, cursor, textBox.width);
      if (!nextLine) {
        break;
      }

      rowIndex += 1;
    }

    let trailingRowIndex = rows.length;
    let trailingCursor = cursor;

    while (true) {
      const line = layoutNextLine(prepared, trailingCursor, textBox.width);
      if (!line) break;

      segments.push({
        text: line.text,
        x: 0,
        y: trailingRowIndex * lineHeight,
        width: textBox.width,
        rowIndex: trailingRowIndex,
        segment: "full",
      });

      trailingCursor = line.end;
      trailingRowIndex += 1;
    }

    const height =
      segments.length > 0
        ? Math.max(...segments.map((segment) => segment.y + lineHeight))
        : baseline.height;

    return { segments, height };
  }, [contourFrame?.rowSpans, lineHeight, prepared, textBox.width]);

  useEffect(() => {
    onMetricsChange({ height: rendered.height });
  }, [onMetricsChange, rendered.height]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-text">
      <div
        className="absolute"
        style={{
          left: textBox.x,
          top: textBox.y,
          width: textBox.width,
          height: Math.max(rendered.height, textBox.height),
        }}
      >
        {rendered.segments.map((segment, index) => (
          <div
            key={`${segment.rowIndex}-${segment.segment}-${index}`}
            className="absolute pointer-events-auto select-text text-slate-800 dark:text-slate-100"
            style={{
              left: segment.x,
              top: segment.y,
              width: segment.width,
              fontFamily: TEXT_FONT_FAMILY,
              fontSize,
              lineHeight: `${lineHeight}px`,
              whiteSpace: "pre",
              textShadow: "0 1px 18px rgba(248, 250, 252, 0.10)",
            }}
          >
            {segment.text}
          </div>
        ))}
      </div>
    </div>
  );
}
