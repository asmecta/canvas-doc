export enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  PAGE_BREAK = 'page_break',
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  backgroundColor?: string;
}

export interface Run {
  text: string;
  style: TextStyle;
}

export enum ParagraphType {
  NORMAL = 'normal',
  HEADING_1 = 'h1',
  HEADING_2 = 'h2',
  HEADING_3 = 'h3',
  BULLET_LIST = 'bullet',
  NUMBER_LIST = 'number',
}

export interface Paragraph {
  type: ElementType.TEXT;
  paragraphType?: ParagraphType;
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

export interface PageBreakElement {
  type: ElementType.PAGE_BREAK;
}

export type EditorElement = Paragraph | ImageElement | TableElement | PageBreakElement;

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

export interface DocumentPosition {
  blockIndex: number;
  runIndex: number;
  offset: number;
}

export interface Selection {
  anchor: DocumentPosition;
  focus: DocumentPosition;
  isBackward: boolean;
}

export const comparePositions = (p1: DocumentPosition, p2: DocumentPosition): number => {
  if (p1.blockIndex !== p2.blockIndex) return p1.blockIndex - p2.blockIndex;
  if (p1.runIndex !== p2.runIndex) return p1.runIndex - p2.runIndex;
  return p1.offset - p2.offset;
};

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
