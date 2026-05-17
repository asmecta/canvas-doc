'use client';

import React, { useMemo } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { ElementType } from '@/lib/editor/types';

export const StatusBar = () => {
  const { elements, zoom, setZoom } = useEditorStore();

  const stats = useMemo(() => {
    let wordCount = 0;
    let charCount = 0;
    let pageCount = 1; // Simplified, in reality would match rendered pages

    elements.forEach(el => {
      if (el.type === ElementType.TEXT) {
        el.runs.forEach(run => {
          charCount += run.text.length;
          wordCount += run.text.trim().split(/\s+/).filter(w => w.length > 0).length;
        });
      }
    });

    return { wordCount, charCount, pageCount };
  }, [elements]);

  return (
    <div className="h-6 bg-white border-t border-[#dadce0] px-4 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
      <div className="flex items-center gap-4">
        <span>Page {stats.pageCount} of {stats.pageCount}</span>
        <span>{stats.wordCount} words</span>
        <span>{stats.charCount} characters</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Saved to cloud
        </span>
        <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
          <button 
            className="hover:bg-gray-100 w-5 h-5 flex items-center justify-center rounded transition-colors"
            onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
          >
            -
          </button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            className="hover:bg-gray-100 w-5 h-5 flex items-center justify-center rounded transition-colors"
            onClick={() => setZoom(Math.min(4, zoom + 0.1))}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
