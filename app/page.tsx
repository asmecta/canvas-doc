'use client';

import React from 'react';
import { Toolbar } from '@/components/editor/Toolbar';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { VersionHistory } from '@/components/editor/VersionHistory';
import { useEditorStore } from '@/lib/editor/store';
import { AnimatePresence } from 'motion/react';
import { 
  FileText, Search, Settings, HelpCircle, 
  MessageSquare, History, User, Layout, 
  ChevronRight, ZoomIn, ZoomOut
} from 'lucide-react';

export default function EditorPage() {
  const { isHistoryOpen, setHistoryOpen } = useEditorStore();

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8f9fa] font-sans overflow-hidden text-[#3c4043]">
      <AnimatePresence>
        {isHistoryOpen && (
          <VersionHistory isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} />
        )}
      </AnimatePresence>
      {/* Top Header */}
      <header className="h-12 flex items-center px-4 bg-white border-b border-[#dadce0] shrink-0">
        <div className="flex items-center gap-3 w-64 shrink-0">
          <div className="bg-[#4285f4] p-1.5 rounded text-white active:scale-95 transition-transform">
            <FileText size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-medium leading-tight truncate">CanvasDoc - Q3 Project Specifications</h1>
            </div>
            <div className="flex gap-3 text-[11px] font-normal text-[#5f6368]">
              <button className="hover:bg-gray-100 px-1 rounded transition-colors">File</button>
              <button className="hover:bg-gray-100 px-1 rounded transition-colors">Edit</button>
              <button className="hover:bg-gray-100 px-1 rounded transition-colors">View</button>
              <button className="hover:bg-gray-100 px-1 rounded transition-colors">Insert</button>
              <button className="hover:bg-gray-100 px-1 rounded transition-colors">Format</button>
              <button className="hover:bg-gray-100 px-1 rounded transition-colors">Tools</button>
            </div>
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#5f6368]">
              <History size={20} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#5f6368]">
              <MessageSquare size={20} />
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f0fe] text-[#174ea6] rounded-full text-sm font-medium hover:bg-[#d2e3fc] transition-colors">
            Share
          </button>
          <div className="w-8 h-8 rounded-full bg-[#7b1fa2] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
            JD
          </div>
        </div>
      </header>

      {/* Toolbar Area */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Document Outline) */}
        <aside className="w-64 bg-white border-r border-[#dadce0] flex flex-col p-4 shrink-0">
          <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-4 px-2">Document Outline</span>
          <div className="flex flex-col gap-1 text-[13px]">
            <OutlineItem title="1. Executive Summary" active />
            <OutlineItem title="2. Market Analysis" indent />
            <OutlineItem title="2.1 Consumer Trends" indentDouble />
            <OutlineItem title="2.2 Competitive Landscape" indentDouble />
            <OutlineItem title="3. Technical Framework" indent />
            <OutlineItem title="4. Resource Allocation" indent />
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-100 text-[11px] text-[#5f6368] px-2 flex flex-col gap-2">
            <button className="flex items-center gap-2 hover:text-[#1a73e8] transition-colors font-medium">
              <Search size={14} /> Find in document
            </button>
            <button className="flex items-center gap-2 hover:text-[#1a73e8] transition-colors font-medium">
              <Settings size={14} /> Formatting settings
            </button>
          </div>
        </aside>

        {/* Editor Wrapper */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f1f3f4] relative overflow-hidden">
          <EditorCanvas />
        </main>
      </div>

      {/* Footer */}
      <footer className="h-7 bg-white border-t border-[#dadce0] px-4 flex items-center justify-between text-[11px] text-[#5f6368] shrink-0 font-medium">
        <div>Page 1 of 1  •  142 words</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 group cursor-pointer hover:text-black">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Saved to Drive
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-black cursor-pointer">English (US)</span>
            <div className="flex items-center gap-1 text-black font-semibold">
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Editing Mode
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function OutlineItem({ title, active, indent, indentDouble }: { title: string, active?: boolean, indent?: boolean, indentDouble?: boolean }) {
  return (
    <div className={`
      px-3 py-1.5 rounded cursor-pointer transition-colors
      ${active ? 'text-[#1a73e8] font-medium bg-[#e8f0fe] border-l-2 border-[#1a73e8]' : 'text-[#5f6368] hover:text-black hover:bg-gray-50 border-l-2 border-transparent'}
      ${indent ? 'ml-3' : ''}
      ${indentDouble ? 'ml-6' : ''}
    `}>
      {title}
    </div>
  );
}
