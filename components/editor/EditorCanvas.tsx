'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { RenderEngine, RenderedBlock } from '@/lib/editor/engine';
import { DEFAULT_PAGE_CONFIG } from '@/lib/editor/types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';

export const EditorCanvas = () => {
  const { elements, updateElement } = useEditorStore();
  const [renderedBlocks, setRenderedBlocks] = useState<RenderedBlock[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // We only need one offscreen canvas to measure and layout
  const layoutCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const lastTextElementIndex = [...elements].reverse().findIndex(el => el.type === 'text');
      if (lastTextElementIndex === -1) return;
      const index = elements.length - 1 - lastTextElementIndex;
      const element = elements[index];
      if (element.type !== 'text') return;
      
      const newRuns = [...element.runs];
      const lastRunIndex = newRuns.length - 1;
      const lastRun = { ...newRuns[lastRunIndex] };
      
      if (lastRun.text.length > 0) {
        lastRun.text = lastRun.text.slice(0, -1);
        newRuns[lastRunIndex] = lastRun;
        updateElement(index, { ...element, runs: newRuns });
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value) {
      const lastTextElementIndex = [...elements].reverse().findIndex(el => el.type === 'text');
      if (lastTextElementIndex === -1) return;
      const index = elements.length - 1 - lastTextElementIndex;
      const element = elements[index];
      if (element.type !== 'text') return;
      
      const newRuns = [...element.runs];
      const lastRunIndex = newRuns.length - 1;
      const lastRun = { ...newRuns[lastRunIndex] };
      
      lastRun.text += value;
      newRuns[lastRunIndex] = lastRun;
      updateElement(index, { ...element, runs: newRuns });
      e.target.value = ''; // Reset input
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Calculate layout whenever elements change
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

  // Number of pages is determined by the max page index in renderedBlocks
  const pageCount = useMemo(() => {
    if (renderedBlocks.length === 0) return 1;
    return Math.max(...renderedBlocks.map(b => b.pageIndex)) + 1;
  }, [renderedBlocks]);

  return (
    <div 
      ref={containerRef} 
      onClick={focusInput}
      className="flex-1 overflow-auto bg-[#f1f3f4] p-8 flex flex-col items-center gap-8 min-h-0 relative outline-none scrollbar-thin scrollbar-thumb-gray-300"
    >
      <div className="absolute top-0 left-0 right-0 h-8 bg-white border-b border-[#dadce0] flex items-center px-[calc(50%-350px)] text-[10px] text-gray-400 select-none z-20">
        <div className="flex-1 flex justify-between px-1 font-mono tracking-widest">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span className="text-black font-bold">6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
        </div>
      </div>

      <textarea
        ref={inputRef}
        className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        onChange={handleInput}
        autoFocus
      />
      {Array.from({ length: pageCount }).map((_, index) => (
        <Page 
          key={index} 
          index={index} 
          renderedBlocks={renderedBlocks} 
        />
      ))}
      
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

const Page = ({ index, renderedBlocks }: { index: number, renderedBlocks: RenderedBlock[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = DEFAULT_PAGE_CONFIG;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const engine = new RenderEngine(ctx, DEFAULT_PAGE_CONFIG);
    engine.render(renderedBlocks, index);

    // Draw a mock cursor at the end of the last text block if it's the last page
    const isLastPage = index === (renderedBlocks.length > 0 ? Math.max(...renderedBlocks.map(b => b.pageIndex)) : 0);
    if (isLastPage) {
      const lastBlock = [...renderedBlocks].reverse().find(b => b.pageIndex === index);
      if (lastBlock && lastBlock.lines.length > 0) {
        const lastLine = lastBlock.lines[lastBlock.lines.length - 1];
        ctx.fillStyle = '#1a73e8';
        ctx.fillRect(lastLine.x + lastLine.width + 1, lastLine.y, 2, lastLine.height);
      }
    }
  }, [renderedBlocks, index, width, height]);

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
