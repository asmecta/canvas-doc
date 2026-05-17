import { EditorElement, ElementType, PageConfig, Run, TextStyle, Selection, DocumentPosition } from './types';

export interface RenderPosition {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedRun {
  run: Run;
  runIndex: number;
  startOffset: number;
  x: number;
  width: number;
  text: string;
}

export interface RenderedLine {
  runs: RenderedRun[];
  x: number;
  y: number;
  width: number;
  height: number;
  ascent: number;
}

export interface RenderedBlock {
  element: EditorElement;
  blockIndex: number;
  lines: RenderedLine[];
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class RenderEngine {
  private ctx: CanvasRenderingContext2D;
  private config: PageConfig;

  constructor(ctx: CanvasRenderingContext2D, config: PageConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  public layout(elements: EditorElement[]): RenderedBlock[] {
    const renderedBlocks: RenderedBlock[] = [];
    let currentPageIndex = 0;
    let currentY = this.config.padding.top;
    const contentWidth = this.config.width - this.config.padding.left - this.config.padding.right;

    elements.forEach((element, blockIndex) => {
      if (element.type === ElementType.TEXT) {
        const lines = this.layoutParagraph(element as any, contentWidth);
        
        let blockLines: RenderedLine[] = [];
        let blockY = currentY;
        
        for (const line of lines) {
          if (currentY + line.height > this.config.height - this.config.padding.bottom) {
            if (blockLines.length > 0) {
              renderedBlocks.push({
                element,
                blockIndex,
                lines: blockLines,
                pageIndex: currentPageIndex,
                x: this.config.padding.left,
                y: blockY,
                width: contentWidth,
                height: currentY - blockY
              });
            }
            
            currentPageIndex++;
            currentY = this.config.padding.top;
            blockY = currentY;
            blockLines = [];
          }
          
          blockLines.push({
            ...line,
            y: currentY
          });
          currentY += line.height;
        }
        
        if (blockLines.length > 0) {
          renderedBlocks.push({
            element,
            blockIndex,
            lines: blockLines,
            pageIndex: currentPageIndex,
            x: this.config.padding.left,
            y: blockY,
            width: contentWidth,
            height: currentY - blockY
          });
        }
        
        currentY += 10; 
      } else if (element.type === ElementType.IMAGE) {
        // Handle images...
        const aspectRatio = element.height / element.width;
        const width = Math.min(element.width, contentWidth);
        const height = width * aspectRatio;

        if (currentY + height > this.config.height - this.config.padding.bottom) {
          currentPageIndex++;
          currentY = this.config.padding.top;
        }

        renderedBlocks.push({
          element,
          blockIndex,
          lines: [],
          pageIndex: currentPageIndex,
          x: this.config.padding.left + (contentWidth - width) / 2,
          y: currentY,
          width,
          height
        });
        currentY += height + 10;
      } else if (element.type === ElementType.PAGE_BREAK) {
        currentPageIndex++;
        currentY = this.config.padding.top;
        renderedBlocks.push({
          element,
          blockIndex,
          lines: [],
          pageIndex: currentPageIndex - 1, // Store mark on the current page bottom
          x: this.config.padding.left,
          y: this.config.height - this.config.padding.bottom,
          width: contentWidth,
          height: 0
        });
      }
    });

    return renderedBlocks;
  }

  private layoutParagraph(element: any, maxWidth: number): Omit<RenderedLine, 'y'>[] {
    const lines: Omit<RenderedLine, 'y'>[] = [];
    const runs = element.runs;
    const isList = element.paragraphType === 'bullet' || element.paragraphType === 'number';
    const listIndent = 30;
    const effectiveMaxWidth = isList ? maxWidth - listIndent : maxWidth;

    let currentLine: { runs: RenderedRun[]; width: number; height: number; ascent: number } = {
      runs: [],
      width: 0,
      height: 0,
      ascent: 0
    };

    runs.forEach((run: Run, runIndex: number) => {
      const words = run.text.split(/(\s+)/);
      this.applyStyle(run.style);
      
      const metrics = this.ctx.measureText('M');
      const baseLineHeight = (run.style.fontSize || 16) * 1.2;
      const lineHeight = baseLineHeight * (element.lineHeight || 1.15);
      const ascent = metrics.actualBoundingBoxAscent || (run.style.fontSize || 16) * 0.8;

      let runOffset = 0;

      for (const word of words) {
        const wordWidth = this.ctx.measureText(word).width;

        if (currentLine.width + wordWidth > effectiveMaxWidth && currentLine.runs.length > 0) {
          lines.push(this.finalizeLine(currentLine, element, maxWidth, listIndent));
          currentLine = { runs: [], width: 0, height: 0, ascent: 0 };
        }

        if (currentLine.runs.length > 0 && currentLine.runs[currentLine.runs.length - 1].runIndex === runIndex) {
          const lastRun = currentLine.runs[currentLine.runs.length - 1];
          lastRun.text += word;
          lastRun.width += wordWidth;
        } else {
          currentLine.runs.push({ 
            run, 
            runIndex, 
            startOffset: runOffset,
            x: 0, // Will be set in finalizeLine
            width: wordWidth, 
            text: word 
          });
        }
        
        runOffset += word.length;
        currentLine.width += wordWidth;
        currentLine.height = Math.max(currentLine.height, lineHeight);
        currentLine.ascent = Math.max(currentLine.ascent, ascent);
      }
    });

    if (currentLine.runs.length > 0) {
      lines.push(this.finalizeLine(currentLine, element, maxWidth, listIndent));
    }

    return lines;
  }

  private finalizeLine(lineData: any, element: any, maxWidth: number, listIndent: number): Omit<RenderedLine, 'y'> {
    const isList = element.paragraphType === 'bullet' || element.paragraphType === 'number';
    const indent = isList ? listIndent : 0;
    const alignment = element.alignment || 'left';
    let startX = this.config.padding.left + indent;

    if (alignment === 'center') {
      startX = this.config.padding.left + (maxWidth - lineData.width) / 2;
    } else if (alignment === 'right') {
      startX = this.config.padding.left + maxWidth - lineData.width;
    }

    let currentX = startX;
    lineData.runs.forEach((r: any) => {
      r.x = currentX;
      currentX += r.width;
    });

    return {
      runs: lineData.runs,
      x: startX,
      width: lineData.width,
      height: lineData.height,
      ascent: lineData.ascent
    };
  }

  private applyStyle(style: TextStyle) {
    const font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Inter, sans-serif'}`;
    this.ctx.font = font;
    this.ctx.fillStyle = style.color || '#000000';
  }

  public render(blocks: RenderedBlock[], pageIndex: number, selection: Selection | null = null, options?: { showAuxiliaryMarks?: boolean }) {
    const pageBlocks = blocks.filter(b => b.pageIndex === pageIndex);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    for (const block of pageBlocks) {
      if (block.element.type === ElementType.TEXT) {
        // Render block-level decorations like list markers
        const isList = (block.element as any).paragraphType === 'bullet' || (block.element as any).paragraphType === 'number';
        if (isList && block.lines.length > 0) {
          this.ctx.fillStyle = '#000000';
          const firstLine = block.lines[0];
          if ((block.element as any).paragraphType === 'bullet') {
            this.ctx.beginPath();
            this.ctx.arc(this.config.padding.left + 15, firstLine.y + firstLine.ascent - 5, 3, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            // Number list would need tracking index across blocks or within block
            // For now, simple "1."
            this.ctx.font = '16px Inter, sans-serif';
            this.ctx.fillText('1.', this.config.padding.left + 5, firstLine.y + firstLine.ascent);
          }
        }

        for (const line of block.lines) {
          for (const renderedRun of line.runs) {
            this.applyStyle(renderedRun.run.style);
            
            // Render Background Highlight
            if (renderedRun.run.style.backgroundColor) {
              this.ctx.fillStyle = renderedRun.run.style.backgroundColor;
              this.ctx.fillRect(renderedRun.x, line.y, renderedRun.width, line.height);
              this.applyStyle(renderedRun.run.style); // Restore fill style for text
            }

            this.ctx.fillText(renderedRun.text, renderedRun.x, line.y + line.ascent);

            // Auxiliary Marks: Spaces
            if (options?.showAuxiliaryMarks) {
              this.renderSpaces(renderedRun, line);
            }
            
            if (renderedRun.run.style.textDecoration === 'underline') {
              this.ctx.beginPath();
              this.ctx.lineWidth = 1;
              this.ctx.lineCap = 'butt';
              this.ctx.moveTo(renderedRun.x, line.y + line.ascent + 2);
              this.ctx.lineTo(renderedRun.x + renderedRun.width, line.y + line.ascent + 2);
              this.ctx.stroke();
            }

            if (renderedRun.run.style.textDecoration === 'line-through') {
              this.ctx.beginPath();
              this.ctx.lineWidth = 1;
              this.ctx.moveTo(renderedRun.x, line.y + line.ascent - 5);
              this.ctx.lineTo(renderedRun.x + renderedRun.width, line.y + line.ascent - 5);
              this.ctx.stroke();
            }
          }
          
          // Render Selection for this line if applicable
          if (selection) {
            this.renderLineSelection(line, block.blockIndex, selection);
          }
        }

        // Auxiliary Marks: Paragraph End
        if (options?.showAuxiliaryMarks && block.lines.length > 0) {
          const lastLine = block.lines[block.lines.length - 1];
          const lastRun = lastLine.runs[lastLine.runs.length - 1];
          this.renderParagraphMark(lastRun.x + lastRun.width, lastLine.y + lastLine.ascent);
        }
      } else if (block.element.type === ElementType.IMAGE) {
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(block.x, block.y, block.width, block.height);
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.strokeRect(block.x, block.y, block.width, block.height);
        this.ctx.fillStyle = '#999999';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Image Placeholder', block.x + block.width / 2, block.y + block.height / 2);
        this.ctx.textAlign = 'left';
      } else if (block.element.type === ElementType.PAGE_BREAK) {
        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = '#babbbd';
        this.ctx.moveTo(this.config.padding.left, this.config.height - this.config.padding.bottom + 10);
        this.ctx.lineTo(this.config.width - this.config.padding.right, this.config.height - this.config.padding.bottom + 10);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = '#babbbd';
        this.ctx.font = '10px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAGE BREAK', this.config.width / 2, this.config.height - this.config.padding.bottom + 8);
        this.ctx.textAlign = 'left';
      }
    }
  }

  private renderLineSelection(line: RenderedLine, blockIndex: number, selection: Selection) {
    const start = selection.isBackward ? selection.focus : selection.anchor;
    const end = selection.isBackward ? selection.anchor : selection.focus;

    if (blockIndex < start.blockIndex || blockIndex > end.blockIndex) return;

    for (const renderedRun of line.runs) {
      const segmentStart = renderedRun.startOffset;
      const segmentEnd = renderedRun.startOffset + renderedRun.text.length;

      let isPartiallySelected = false;
      if (blockIndex > start.blockIndex && blockIndex < end.blockIndex) {
        isPartiallySelected = true;
      } else if (blockIndex === start.blockIndex && blockIndex === end.blockIndex) {
        // Selection is entirely within this block
        if (renderedRun.runIndex > start.runIndex && renderedRun.runIndex < end.runIndex) {
          isPartiallySelected = true;
        } else if (renderedRun.runIndex === start.runIndex && renderedRun.runIndex === end.runIndex) {
          isPartiallySelected = !(segmentEnd <= start.offset || segmentStart >= end.offset);
        } else if (renderedRun.runIndex === start.runIndex) {
          isPartiallySelected = segmentEnd > start.offset;
        } else if (renderedRun.runIndex === end.runIndex) {
          isPartiallySelected = segmentStart < end.offset;
        }
      } else if (blockIndex === start.blockIndex) {
        // This is the beginning block of a multi-block selection
        if (renderedRun.runIndex > start.runIndex) {
          isPartiallySelected = true;
        } else if (renderedRun.runIndex === start.runIndex) {
          isPartiallySelected = segmentEnd > start.offset;
        }
      } else if (blockIndex === end.blockIndex) {
        // This is the end block of a multi-block selection
        if (renderedRun.runIndex < end.runIndex) {
          isPartiallySelected = true;
        } else if (renderedRun.runIndex === end.runIndex) {
          isPartiallySelected = segmentStart < end.offset;
        }
      }

      if (!isPartiallySelected) continue;

      let highlightX = renderedRun.x;
      let highlightWidth = renderedRun.width;

      if (blockIndex === start.blockIndex && renderedRun.runIndex === start.runIndex) {
        if (start.offset > segmentStart) {
          this.applyStyle(renderedRun.run.style);
          const relativeOffset = start.offset - segmentStart;
          const beforeWidth = this.ctx.measureText(renderedRun.text.substring(0, relativeOffset)).width;
          highlightX += beforeWidth;
          highlightWidth -= beforeWidth;
        }
      }

      if (blockIndex === end.blockIndex && renderedRun.runIndex === end.runIndex) {
        if (end.offset < segmentEnd) {
          this.applyStyle(renderedRun.run.style);
          const relativeOffset = end.offset - segmentStart;
          const afterWidth = this.ctx.measureText(renderedRun.text.substring(relativeOffset)).width;
          highlightWidth -= afterWidth;
        }
      }

      if (highlightWidth > 0) {
        this.ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
        this.ctx.fillRect(highlightX, line.y, highlightWidth, line.height);
      }
    }
  }

  private renderSpaces(run: RenderedRun, line: any) {
    const spaceChar = '·';
    const tabChar = '→';
    this.ctx.fillStyle = '#babbbd';
    this.ctx.font = `${run.run.style.fontSize || 16}px Inter, sans-serif`;
    
    let currentX = run.x;
    // Split by spaces or tabs
    const segments = run.text.split(/(\s+)/);
    
    segments.forEach(segment => {
      const segmentWidth = this.ctx.measureText(segment).width;
      if (/^\s+$/.test(segment)) {
        if (segment.includes('\t')) {
          // Tab marking
          this.ctx.fillText(tabChar, currentX + (segmentWidth / 2) - 4, line.y + line.ascent);
        } else {
          // Space marking
          const singleSpaceWidth = this.ctx.measureText(' ').width;
          const spacesCount = Math.round(segmentWidth / singleSpaceWidth);
          for (let i = 0; i < spacesCount; i++) {
            this.ctx.fillText(spaceChar, currentX + (i * singleSpaceWidth) + (singleSpaceWidth / 2) - 2, line.y + line.ascent);
          }
        }
      }
      currentX += segmentWidth;
    });
  }

  private renderParagraphMark(x: number, y: number) {
    this.ctx.fillStyle = '#babbbd';
    this.ctx.font = '14px Inter, sans-serif';
    this.ctx.fillText('¶', x + 4, y);
  }
}
