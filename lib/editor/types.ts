export enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
}

export interface Run {
  text: string;
  style: TextStyle;
}

export interface Paragraph {
  type: ElementType.TEXT;
  runs: Run[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  spacingBefore?: number;
  spacingAfter?: number;
}

export interface ImageElement {
  type: ElementType.IMAGE;
  src: string;
  width: number;
  height: number;
  alignment?: 'left' | 'center' | 'right';
  caption?: string;
}

export interface TableCell {
  runs: Run[];
  style?: TextStyle;
  backgroundColor?: string;
}

export interface TableElement {
  type: ElementType.TABLE;
  rows: TableCell[][];
  widths: number[]; // Percentage or absolute
}

export type EditorElement = Paragraph | ImageElement | TableElement;

export interface PageConfig {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  width: 794, // A4 at 96 DPI
  height: 1123,
  padding: {
    top: 96, // 1 inch
    right: 96,
    bottom: 96,
    left: 96,
  },
};
