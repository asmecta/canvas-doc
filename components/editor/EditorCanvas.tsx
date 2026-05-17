'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { RenderEngine, RenderedBlock, RenderedLine } from '@/lib/editor/engine';
import { DEFAULT_PAGE_CONFIG, Selection, DocumentPosition, ElementType, comparePositions } from '@/lib/editor/types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { ContextMenu } from './ContextMenu';

export const EditorCanvas = () => {
  const { elements, updateElement, selection, setSelection, undo, redo, addElement, toggleSelectionStyle, zoom, showAuxiliaryMarks } = useEditorStore();
  const [renderedBlocks, setRenderedBlocks] = useState<RenderedBlock[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!zoomedContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(zoomedContainerRef.current);
    return () => observer.disconnect();
  }, []);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const layoutCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const toggleStyle = useCallback((style: any) => {
    if (!selection) return;
    toggleSelectionStyle(style);
  }, [selection, toggleSelectionStyle]);

  const selectAll = useCallback(() => {
    if (elements.length === 0) return;
    const lastBlockIndex = elements.length - 1;
    const lastBlock = elements[lastBlockIndex];
    let lastRunIndex = 0;
    let lastOffset = 0;
    if (lastBlock.type === ElementType.TEXT) {
      lastRunIndex = lastBlock.runs.length - 1;
      lastOffset = lastBlock.runs[lastRunIndex].text.length;
    }

    setSelection({
      anchor: { blockIndex: 0, runIndex: 0, offset: 0 },
      focus: { blockIndex: lastBlockIndex, runIndex: lastRunIndex, offset: lastOffset },
      isBackward: false
    });
  }, [elements, setSelection]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            toggleStyle({ fontWeight: 'bold' });
            break;
          case 'i':
            e.preventDefault();
            toggleStyle({ fontStyle: 'italic' });
            break;
          case 'u':
            e.preventDefault();
            toggleStyle({ textDecoration: 'underline' });
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undo, redo, toggleStyle, selectAll]);

  const findPositionFromEvent = (e: React.MouseEvent | MouseEvent): DocumentPosition | null => {
    if (!zoomedContainerRef.current) return null;
    const rect = zoomedContainerRef.current.getBoundingClientRect();
    const pageWidth = DEFAULT_PAGE_CONFIG.width;
    const pageHeight = DEFAULT_PAGE_CONFIG.height;
    const pageGap = 32;
    const pageTotalHeight = pageHeight + pageGap;

    // Coordinates relative to the unscaled container
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Centering calculation
    const horizontalMargin = Math.max(32, (containerWidth - pageWidth) / 2);

    // Calculate page index accounting for auxiliary marks
    let pageIndex = 0;
    let accumulatedHeight = 48; // py-12
    const auxMarkHeight = 28;
    const baseGap = 32;

    while (pageIndex < pageCount) {
        const pageTop = accumulatedHeight;
        const pageBottom = pageTop + pageHeight;
        if (y >= pageTop && y <= pageBottom + baseGap / 2) {
            break;
        }
        accumulatedHeight += pageHeight + baseGap;
        if (showAuxiliaryMarks) {
            accumulatedHeight += auxMarkHeight + baseGap;
        }
        pageIndex++;
    }
    
    if (pageIndex >= pageCount) pageIndex = pageCount - 1;

    // Adjust relative to the start of the page content
    const localY = y - (48 + pageIndex * (pageHeight + baseGap) + (showAuxiliaryMarks ? pageIndex * (auxMarkHeight + baseGap) : 0));
    const localX = x - horizontalMargin;

    const block = renderedBlocks.find(b => 
      b.pageIndex === pageIndex && 
      localY >= b.y && 
      localY <= b.y + b.height
    );

    if (block && block.element.type === ElementType.TEXT) {
      const line = block.lines.find(l => localY >= l.y && localY <= l.y + l.height);
      if (line) {
        if (!layoutCanvasRef.current) return null;
        const ctx = layoutCanvasRef.current.getContext('2d');
        if (!ctx) return null;
        
        let bestPos = { blockIndex: block.blockIndex, runIndex: 0, offset: 0 };
        let minDistance = Infinity;

        for (const run of line.runs) {
          const style = (block.element as any).runs[run.runIndex].style;
          const font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Inter, sans-serif'}`;
          ctx.font = font;

          for (let i = 0; i <= run.text.length; i++) {
            const charX = run.x + ctx.measureText(run.text.substring(0, i)).width;
            const distance = Math.abs(localX - charX);
            if (distance < minDistance) {
              minDistance = distance;
              bestPos = { blockIndex: block.blockIndex, runIndex: run.runIndex, offset: run.startOffset + i };
            }
          }
        }
        return bestPos;
      }
    } else if (renderedBlocks.length > 0) {
      const pageBlocks = renderedBlocks.filter(b => b.pageIndex === pageIndex);
      if (pageBlocks.length > 0) {
        const nearestBlock = pageBlocks.reduce((prev, curr) => {
          const prevDist = Math.abs(localY - (prev.y + prev.height / 2));
          const currDist = Math.abs(localY - (curr.y + curr.height / 2));
          return currDist < prevDist ? curr : prev;
        });
        
        if (nearestBlock.element.type === ElementType.TEXT) {
          const lastLine = nearestBlock.lines[nearestBlock.lines.length - 1];
          const lastRun = lastLine.runs[lastLine.runs.length - 1];
          return { blockIndex: nearestBlock.blockIndex, runIndex: lastRun.runIndex, offset: lastRun.text.length };
        }
      }
    }
    return null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) setContextMenu(null);
    if (e.button === 2) return; // Ignore right click for selection
    const pos = findPositionFromEvent(e);
    if (pos) {
      setSelection({ anchor: pos, focus: pos, isBackward: false });
      setIsSelecting(true);
    } else {
      setSelection(null);
    }
    focusInput();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting && selection) {
      const pos = findPositionFromEvent(e);
      if (pos && selection) {
        setSelection({ 
          ...selection, 
          focus: pos,
          isBackward: comparePositions(selection.anchor, pos) > 0
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const pos = selection?.focus || (elements.length > 0 ? {
        blockIndex: elements.length - 1,
        runIndex: elements[elements.length - 1].type === ElementType.TEXT ? (elements[elements.length - 1] as any).runs.length - 1 : 0,
        offset: elements[elements.length - 1].type === ElementType.TEXT ? (elements[elements.length - 1] as any).runs[(elements[elements.length - 1] as any).runs.length - 1].text.length : 0
      } : { blockIndex: 0, runIndex: 0, offset: 0 });

      const block = elements[pos.blockIndex];
      if (block?.type === ElementType.TEXT) {
        const currentRun = block.runs[pos.runIndex];
        const textBefore = currentRun.text.substring(0, pos.offset);
        const textAfter = currentRun.text.substring(pos.offset);

        const runsBefore = [
          ...block.runs.slice(0, pos.runIndex),
          { ...currentRun, text: textBefore }
        ].filter(r => r.text !== '' || block.runs.length === 1);
        
        const runsAfter = [
          { ...currentRun, text: textAfter },
          ...block.runs.slice(pos.runIndex + 1)
        ].filter(r => r.text !== '' || block.runs.length === 1);

        if (runsBefore.length === 0) runsBefore.push({ text: '', style: currentRun.style });
        if (runsAfter.length === 0) runsAfter.push({ text: '', style: currentRun.style });

        const newElements = [...elements];
        newElements[pos.blockIndex] = { ...block, runs: runsBefore };
        newElements.splice(pos.blockIndex + 1, 0, {
          type: ElementType.TEXT,
          runs: runsAfter
        });

        useEditorStore.getState().setElements(newElements);
        setSelection({
          anchor: { blockIndex: pos.blockIndex + 1, runIndex: 0, offset: 0 },
          focus: { blockIndex: pos.blockIndex + 1, runIndex: 0, offset: 0 },
          isBackward: false
        });
      }
    } else if (e.key === 'Backspace') {
      if (!selection) return;
      const { anchor, focus } = selection;
      const isCollapsed = anchor.blockIndex === focus.blockIndex && anchor.runIndex === focus.runIndex && anchor.offset === focus.offset;

      if (isCollapsed) {
        // Backspace one character
        if (anchor.offset > 0) {
          const block = elements[anchor.blockIndex];
          if (block.type === ElementType.TEXT) {
            const newRuns = [...block.runs];
            const run = { ...newRuns[anchor.runIndex] };
            run.text = run.text.substring(0, anchor.offset - 1) + run.text.substring(anchor.offset);
            newRuns[anchor.runIndex] = run;
            updateElement(anchor.blockIndex, { ...block, runs: newRuns });
            const newPos = { ...anchor, offset: anchor.offset - 1 };
            setSelection({ anchor: newPos, focus: newPos, isBackward: false });
          }
        } else if (anchor.runIndex > 0) {
          // Move to previous run
          const block = elements[anchor.blockIndex] as any;
          const prevRun = block.runs[anchor.runIndex - 1];
          const newPos = { ...anchor, runIndex: anchor.runIndex - 1, offset: prevRun.text.length };
          setSelection({ anchor: newPos, focus: newPos, isBackward: false });
        } else if (anchor.blockIndex > 0) {
          // Merge or delete block
          const prevBlockIndex = anchor.blockIndex - 1;
          const prevBlock = elements[prevBlockIndex];
          const currBlock = elements[anchor.blockIndex];
          if (prevBlock.type === ElementType.TEXT && currBlock.type === ElementType.TEXT) {
            const lastRunIdx = prevBlock.runs.length - 1;
            const lastRunOffset = prevBlock.runs[lastRunIdx].text.length;
            const newPrevRuns = [...prevBlock.runs, ...currBlock.runs];
            const newElements = [...elements];
            newElements[prevBlockIndex] = { ...prevBlock, runs: newPrevRuns };
            newElements.splice(anchor.blockIndex, 1);
            useEditorStore.getState().setElements(newElements);
            const newPos = { blockIndex: prevBlockIndex, runIndex: lastRunIdx, offset: lastRunOffset };
            setSelection({ anchor: newPos, focus: newPos, isBackward: false });
          } else if (prevBlock.type === ElementType.PAGE_BREAK) {
            const newElements = [...elements];
            newElements.splice(prevBlockIndex, 1);
            useEditorStore.getState().setElements(newElements);
            const newPos = { ...anchor, blockIndex: anchor.blockIndex - 1 };
            setSelection({ anchor: newPos, focus: newPos, isBackward: false });
          }
        }
      } else {
        // Delete selection range
        const start = selection.isBackward ? selection.focus : selection.anchor;
        const end = selection.isBackward ? selection.anchor : selection.focus;
        
        const newElements = JSON.parse(JSON.stringify(elements));
        // Simple deletion for same block
        if (start.blockIndex === end.blockIndex) {
          const block = newElements[start.blockIndex];
          const textBefore = block.runs[start.runIndex].text.substring(0, start.offset);
          const textAfter = block.runs[end.runIndex].text.substring(end.offset);
          block.runs = [
            ...block.runs.slice(0, start.runIndex),
            { ...block.runs[start.runIndex], text: textBefore + textAfter },
            ...block.runs.slice(end.runIndex + 1)
          ];
          useEditorStore.getState().setElements(newElements);
          setSelection({ anchor: start, focus: start, isBackward: false });
        }
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const pos = selection?.focus || { blockIndex: 0, runIndex: 0, offset: 0 };
      const block = elements[pos.blockIndex];
      const isVertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
      
      let targetBlockIndex = pos.blockIndex;
      let targetRunIndex = pos.runIndex;
      let targetOffset = pos.offset;

      if (e.key === 'ArrowLeft') {
        if (pos.offset > 0) {
          targetOffset--;
        } else if (pos.runIndex > 0) {
          targetRunIndex--;
          targetOffset = (block as any).runs[targetRunIndex].text.length;
        } else if (pos.blockIndex > 0) {
          targetBlockIndex--;
          while (targetBlockIndex >= 0 && elements[targetBlockIndex].type !== ElementType.TEXT) {
            targetBlockIndex--;
          }
          if (targetBlockIndex >= 0) {
            const prevTextBlock = elements[targetBlockIndex] as any;
            targetRunIndex = prevTextBlock.runs.length - 1;
            targetOffset = prevTextBlock.runs[targetRunIndex].text.length;
          } else {
            targetBlockIndex = pos.blockIndex;
          }
        }
      } else if (e.key === 'ArrowRight') {
        if (pos.offset < (block as any).runs?.[pos.runIndex]?.text.length) {
          targetOffset++;
        } else if (pos.runIndex < (block as any).runs?.length - 1) {
          targetRunIndex++;
          targetOffset = 0;
        } else if (pos.blockIndex < elements.length - 1) {
          targetBlockIndex++;
          while (targetBlockIndex < elements.length && elements[targetBlockIndex].type !== ElementType.TEXT) {
            targetBlockIndex++;
          }
          if (targetBlockIndex < elements.length) {
            targetRunIndex = 0;
            targetOffset = 0;
          } else {
            targetBlockIndex = pos.blockIndex;
          }
        }
      } else if (isVertical) {
        const isUp = e.key === 'ArrowUp';
        const rBlock = renderedBlocks.find(b => b.blockIndex === pos.blockIndex);
        if (rBlock) {
          const lineIndex = rBlock.lines.findIndex(l => l.runs.some(r => r.runIndex === pos.runIndex && pos.offset >= r.startOffset && pos.offset <= r.startOffset + r.text.length));
          if (isUp) {
            if (lineIndex > 0) {
              const prevLine = rBlock.lines[lineIndex - 1];
              const prevRun = prevLine.runs[0];
              targetRunIndex = prevRun.runIndex;
              targetOffset = prevRun.startOffset;
            } else if (pos.blockIndex > 0) {
              targetBlockIndex--;
              while (targetBlockIndex >= 0 && elements[targetBlockIndex].type !== ElementType.TEXT) {
                targetBlockIndex--;
              }
              if (targetBlockIndex >= 0) {
                const prevTextBlock = elements[targetBlockIndex] as any;
                targetRunIndex = prevTextBlock.runs.length - 1;
                targetOffset = prevTextBlock.runs[targetRunIndex].text.length;
              }
            }
          } else {
            if (lineIndex !== -1 && lineIndex < rBlock.lines.length - 1) {
              const nextLine = rBlock.lines[lineIndex + 1];
              const nextRun = nextLine.runs[0];
              targetRunIndex = nextRun.runIndex;
              targetOffset = nextRun.startOffset;
            } else if (pos.blockIndex < elements.length - 1) {
              targetBlockIndex++;
              while (targetBlockIndex < elements.length && elements[targetBlockIndex].type !== ElementType.TEXT) {
                targetBlockIndex++;
              }
              if (targetBlockIndex < elements.length) {
                targetRunIndex = 0;
                targetOffset = 0;
              }
            }
          }
        }
      }

      const newPos = { blockIndex: targetBlockIndex, runIndex: targetRunIndex, offset: targetOffset };
      setSelection({
        anchor: e.shiftKey ? selection!.anchor : newPos,
        focus: newPos,
        isBackward: e.shiftKey ? comparePositions(selection!.anchor, newPos) > 0 : false
      });
    }
  };

  const processInput = (text: string) => {
    const pos = selection?.focus || (elements.length > 0 ? {
      blockIndex: elements.length - 1,
      runIndex: (elements[elements.length - 1] as any).runs?.length - 1 || 0,
      offset: (elements[elements.length - 1] as any).runs?.[(elements[elements.length - 1] as any).runs?.length - 1]?.text.length || 0
    } : { blockIndex: 0, runIndex: 0, offset: 0 });

    const block = elements[pos.blockIndex];
    if (block && block.type === ElementType.TEXT) {
      const newRuns = [...block.runs];
      const run = { ...newRuns[pos.runIndex] };
      const newText = run.text.substring(0, pos.offset) + text + run.text.substring(pos.offset);
      run.text = newText;
      newRuns[pos.runIndex] = run;
      
      updateElement(pos.blockIndex, { ...block, runs: newRuns });
      
      const newPos = { ...pos, offset: pos.offset + text.length };
      setSelection({
        anchor: newPos,
        focus: newPos,
        isBackward: false
      });
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    const value = e.target.value;
    if (value) {
      processInput(value);
      e.target.value = ''; 
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    // On some browsers, the input event fires before compositionend, on others after.
    // We handle the text in compositionend for safety or just let it pass through to handleInput if it works.
    // However, usually it's cleaner to handle it here.
    const text = e.data;
    if (text) {
      processInput(text);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!layoutCanvasRef.current) {
      layoutCanvasRef.current = document.createElement('canvas');
    }
    const ctx = layoutCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const engine = new RenderEngine(ctx, DEFAULT_PAGE_CONFIG);
    const blocks = engine.layout(elements);
    setRenderedBlocks(blocks);
  }, [elements]);

  const pageCount = useMemo(() => {
    if (renderedBlocks.length === 0) return 1;
    return Math.max(...renderedBlocks.map(b => b.pageIndex)) + 1;
  }, [renderedBlocks]);

  const cursorCoords = useMemo(() => {
    if (!selection) return null;
    const pos = selection.focus;
    const block = renderedBlocks.find(b => b.blockIndex === pos.blockIndex);
    if (!block) return null;

    const line = block.lines.find(l => {
      return l.runs.some(r => 
        r.runIndex === pos.runIndex && 
        pos.offset >= r.startOffset && 
        pos.offset <= r.startOffset + r.text.length
      );
    });
    if (!line) return null;

    const renderedRun = line.runs.find(r => 
      r.runIndex === pos.runIndex && 
      pos.offset >= r.startOffset && 
      pos.offset <= r.startOffset + r.text.length
    );
    if (!renderedRun) return null;

    // Use a temporary canvas or the layoutCanvasRef
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const style = (block.element as any).runs[pos.runIndex].style;
    ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Inter, sans-serif'}`;
    
    const offsetInRenderedRun = pos.offset - renderedRun.startOffset; 
    const offsetWidth = ctx.measureText(renderedRun.text.substring(0, offsetInRenderedRun)).width;

    const pageWidth = DEFAULT_PAGE_CONFIG.width;
    const horizontalMargin = Math.max(32, (containerWidth - pageWidth) / 2);
    
    // Account for auxiliary mark height if shown
    const auxMarkHeight = 28; // height + margin/padding
    const baseGap = 32;
    let yOffset = 48; // py-12
    for(let i = 0; i < block.pageIndex; i++) {
        yOffset += DEFAULT_PAGE_CONFIG.height + baseGap;
        if (showAuxiliaryMarks) {
            yOffset += auxMarkHeight + baseGap;
        }
    }

    return {
      x: horizontalMargin + renderedRun.x + offsetWidth,
      y: yOffset + line.y,
      height: line.height
    };
  }, [selection, renderedBlocks, containerWidth, showAuxiliaryMarks]);

  useEffect(() => {
    if (selection && cursorCoords && containerRef.current) {
      const container = containerRef.current;
      const { anchor, focus } = selection;
      const isCollapsed = anchor.blockIndex === focus.blockIndex && anchor.runIndex === focus.runIndex && anchor.offset === focus.offset;
      
      if (isCollapsed) {
        const cursorY = cursorCoords.y * zoom;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        if (cursorY < scrollTop + 100) {
          container.scrollTo({ top: cursorY - 150, behavior: 'smooth' });
        } else if (cursorY > scrollTop + containerHeight - 100) {
          container.scrollTo({ top: cursorY - containerHeight + 200, behavior: 'smooth' });
        }
      }
    }
  }, [selection, cursorCoords, zoom]);

  return (
    <div 
      ref={containerRef} 
      onClick={focusInput}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      className="flex-1 overflow-auto bg-[#f1f3f4] p-8 flex flex-col items-center gap-8 min-h-0 relative outline-none scrollbar-thin scrollbar-thumb-gray-300"
    >
      <div className="absolute top-0 left-0 right-0 h-8 bg-white border-b border-[#dadce0] flex items-center px-[calc(50%-350px)] text-[10px] text-gray-400 select-none z-20">
        <div className="flex-1 flex justify-between px-1 font-mono tracking-widest">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span className="text-black font-bold">6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
        </div>
      </div>

      <div 
        ref={zoomedContainerRef}
        className="flex flex-col items-center gap-8 py-12 transition-transform duration-200 ease-out origin-top relative"
        style={{ transform: `scale(${zoom})`, width: '100%' }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          className="absolute opacity-0 pointer-events-none z-0 overflow-hidden outline-none resize-none"
          style={cursorCoords ? {
            top: cursorCoords.y,
            left: cursorCoords.x,
            width: '2px',
            height: cursorCoords.height,
          } : { top: 0, left: 0 }}
          onKeyDown={handleKeyDown}
          onChange={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          autoFocus
        />

        {/* Visual Cursor */}
        {selection && cursorCoords && (selection.anchor.blockIndex === selection.focus.blockIndex && selection.anchor.runIndex === selection.focus.runIndex && selection.anchor.offset === selection.focus.offset) && (
          <div 
            className="absolute w-[2px] bg-[#1a73e8] animate-[cursor-blink_1s_infinite] pointer-events-none z-30"
            style={{
              left: cursorCoords.x,
              top: cursorCoords.y,
              height: cursorCoords.height,
            }}
          />
        )}

      {Array.from({ length: pageCount }).map((_, index) => (
        <React.Fragment key={index}>
          <Page 
            index={index} 
            renderedBlocks={renderedBlocks} 
            selection={selection}
            showAuxiliaryMarks={showAuxiliaryMarks}
          />
          {showAuxiliaryMarks && index < pageCount - 1 && (
            <div className="w-full flex items-center gap-4 text-[#babbbd] text-[10px] select-none h-[28px]">
              <div className="flex-1 h-px bg-[#dadce0] border-t border-dashed" />
              <span className="font-mono tracking-widest whitespace-nowrap px-4 py-1 border border-[#dadce0] rounded bg-white">PAGE BREAK</span>
              <div className="flex-1 h-px bg-[#dadce0] border-t border-dashed" />
            </div>
          )}
        </React.Fragment>
      ))}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={() => setContextMenu(null)} 
        />
      )}
      
      {/* Floating Action/Comment */}
      <div className="fixed right-6 bottom-12 flex flex-col gap-3 group">
        <button className="w-12 h-12 bg-white rounded-full shadow-lg border border-[#dadce0] flex items-center justify-center text-[#1a73e8] hover:bg-gray-50 transition-all active:scale-95">
          <MessageSquare size={20} />
        </button>
      </div>

      <div className="h-20 shrink-0" />
    </div>
  );
};

const Page = ({ index, renderedBlocks, selection, showAuxiliaryMarks }: { index: number, renderedBlocks: RenderedBlock[], selection: Selection | null, showAuxiliaryMarks?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = DEFAULT_PAGE_CONFIG;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const engine = new RenderEngine(ctx, DEFAULT_PAGE_CONFIG);
    engine.render(renderedBlocks, index, selection, { showAuxiliaryMarks });
  }, [renderedBlocks, index, width, height, selection, showAuxiliaryMarks]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] border border-[#dadce0] relative z-10"
      style={{ width, height }}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0"
      />
      <div className="absolute top-2 right-2 text-[10px] text-gray-200 font-mono select-none">
        {index + 1}
      </div>
    </motion.div>
  );
};
