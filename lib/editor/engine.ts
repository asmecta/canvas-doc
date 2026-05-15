import { EditorElement, ElementType, PageConfig, Run, TextStyle } from './types';

export interface RenderPosition {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedLine {
  runs: Run[];
  x: number;
  y: number;
  width: number;
  height: number;
  ascent: number;
}

export interface RenderedBlock {
  element: EditorElement;
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

    for (const element of elements) {
      if (element.type === ElementType.TEXT) {
        const lines = this.layoutParagraph(element.runs, contentWidth);
        
        let blockLines: RenderedLine[] = [];
        let blockY = currentY;
        
        for (const line of lines) {
          // Check if line fits on current page
          if (currentY + line.height > this.config.height - this.config.padding.bottom) {
            // Start new page
            if (blockLines.length > 0) {
              renderedBlocks.push({
                element,
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
            lines: blockLines,
            pageIndex: currentPageIndex,
            x: this.config.padding.left,
            y: blockY,
            width: contentWidth,
            height: currentY - blockY
          });
        }
        
        // Add paragraph spacing
        currentY += 10; 
      } else if (element.type === ElementType.IMAGE) {
        const aspectRatio = element.height / element.width;
        const width = Math.min(element.width, contentWidth);
        const height = width * aspectRatio;

        if (currentY + height > this.config.height - this.config.padding.bottom) {
          currentPageIndex++;
          currentY = this.config.padding.top;
        }

        renderedBlocks.push({
          element,
          lines: [],
          pageIndex: currentPageIndex,
          x: this.config.padding.left + (contentWidth - width) / 2,
          y: currentY,
          width,
          height
        });
        currentY += height + 10;
      }
    }

    return renderedBlocks;
  }

  private layoutParagraph(runs: Run[], maxWidth: number): Omit<RenderedLine, 'y'>[] {
    const lines: Omit<RenderedLine, 'y'>[] = [];
    let currentLine: { runs: Run[]; width: number; height: number; ascent: number } = {
      runs: [],
      width: 0,
      height: 0,
      ascent: 0
    };

    for (const run of runs) {
      const words = run.text.split(/(\s+)/);
      this.applyStyle(run.style);
      
      const metrics = this.ctx.measureText('M');
      const lineHeight = (run.style.fontSize || 16) * 1.2;
      const ascent = metrics.actualBoundingBoxAscent || (run.style.fontSize || 16) * 0.8;

      for (const word of words) {
        const wordWidth = this.ctx.measureText(word).width;

        if (currentLine.width + wordWidth > maxWidth && currentLine.runs.length > 0) {
          lines.push({
            runs: currentLine.runs,
            x: this.config.padding.left,
            width: currentLine.width,
            height: currentLine.height,
            ascent: currentLine.ascent
          });
          currentLine = { runs: [], width: 0, height: 0, ascent: 0 };
        }

        // Add word to current run/line
        if (currentLine.runs.length > 0 && currentLine.runs[currentLine.runs.length - 1].style === run.style) {
          currentLine.runs[currentLine.runs.length - 1].text += word;
        } else {
          currentLine.runs.push({ text: word, style: run.style });
        }
        
        currentLine.width += wordWidth;
        currentLine.height = Math.max(currentLine.height, lineHeight);
        currentLine.ascent = Math.max(currentLine.ascent, ascent);
      }
    }

    if (currentLine.runs.length > 0) {
      lines.push({
        runs: currentLine.runs,
        x: this.config.padding.left,
        width: currentLine.width,
        height: currentLine.height,
        ascent: currentLine.ascent
      });
    }

    return lines;
  }

  private applyStyle(style: TextStyle) {
    const font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Inter, sans-serif'}`;
    this.ctx.font = font;
    this.ctx.fillStyle = style.color || '#000000';
  }

  public render(blocks: RenderedBlock[], pageIndex: number) {
    const pageBlocks = blocks.filter(b => b.pageIndex === pageIndex);
    
    // Clear page
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    for (const block of pageBlocks) {
      if (block.element.type === ElementType.TEXT) {
        for (const line of block.lines) {
          let currentX = line.x;
          for (const run of line.runs) {
            this.applyStyle(run.style);
            this.ctx.fillText(run.text, currentX, line.y + line.ascent);
            
            if (run.style.textDecoration === 'underline') {
              this.ctx.beginPath();
              this.ctx.moveTo(currentX, line.y + line.ascent + 2);
              this.ctx.lineTo(currentX + this.ctx.measureText(run.text).width, line.y + line.ascent + 2);
              this.ctx.stroke();
            }
            
            currentX += this.ctx.measureText(run.text).width;
          }
        }
      } else if (block.element.type === ElementType.IMAGE) {
        // Draw placeholder for image
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(block.x, block.y, block.width, block.height);
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.strokeRect(block.x, block.y, block.width, block.height);
        this.ctx.fillStyle = '#999999';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Image Placeholder', block.x + block.width / 2, block.y + block.height / 2);
        this.ctx.textAlign = 'left';
      }
    }
  }
}
