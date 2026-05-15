'use client';

import React, { useRef } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Image as ImageIcon, Table as TableIcon, Type, Undo, Redo,
  ChevronDown, Download, Upload, History, Save
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { ElementType } from '@/lib/editor/types';
import { useEditorExport } from '@/lib/editor/export';

export const Toolbar = () => {
  const { undo, redo, addElement, setHistoryOpen, saveVersion } = useEditorStore();
  const { exportToPDF, exportToDOCX, importFromTXT, importFromDOCX } = useEditorExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImage = () => {
    addElement({
      type: ElementType.IMAGE,
      src: 'https://picsum.photos/seed/word/800/400',
      width: 400,
      height: 200,
      alignment: 'center'
    });
  };

  const handleAddTable = () => {
    alert('Table insertion triggered (Logic would go here)');
  };

  const handleSaveVersion = () => {
    const name = prompt('Enter a name for this version:', `Version ${new Date().toLocaleTimeString()}`);
    if (name) saveVersion(name);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      importFromDOCX(file);
    } else if (file.name.endsWith('.txt')) {
      importFromTXT(file);
    } else {
      alert('Unsupported file format. Please use .docx or .txt');
    }
    e.target.value = '';
  };

  const handleExportPDF = () => {
    const canvases = Array.from(document.querySelectorAll('canvas')).filter(c => c.style.display !== 'none' && c.width > 0);
    // Note: This logic assumes the canvases are in order. In a real app we'd target them specifically.
    exportToPDF(canvases as HTMLCanvasElement[]);
  };

  return (
    <div className="h-10 flex items-center px-3 bg-[#edf2fa] mx-4 my-2 rounded-full border border-[#dadce0] shrink-0 gap-1 shadow-sm sticky top-0 z-50 overflow-x-auto">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".docx,.txt" 
        className="hidden" 
      />

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6">
        <ToolbarButton onClick={undo} icon={<Undo size={16} />} title="Undo" />
        <ToolbarButton onClick={redo} icon={<Redo size={16} />} title="Redo" />
        <ToolbarButton onClick={() => setHistoryOpen(true)} icon={<History size={16} />} title="Version History" />
        <ToolbarButton onClick={handleSaveVersion} icon={<Save size={16} />} title="Save Version" />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6">
        <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />} title="Import (.docx, .txt)" />
        <ToolbarButton onClick={handleExportPDF} icon={<Download size={16} />} title="Export PDF" />
        <ToolbarButton onClick={exportToDOCX} icon={<div className="text-[10px] font-bold">DOCX</div>} title="Export DOCX" />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] text-xs font-semibold gap-2 h-6">
        <div className="flex items-center px-3 py-1 hover:bg-gray-200 rounded cursor-pointer gap-2 transition-colors whitespace-nowrap">
          <span>Normal text</span>
          <ChevronDown size={12} className="text-gray-500" />
        </div>
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6">
        <ToolbarButton icon={<Bold size={16} />} title="Bold" />
        <ToolbarButton icon={<Italic size={16} />} title="Italic" />
        <ToolbarButton icon={<Underline size={16} />} title="Underline" />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6">
        <ToolbarButton icon={<AlignLeft size={16} />} title="Align Left" />
        <ToolbarButton icon={<AlignCenter size={16} />} title="Align Center" />
        <ToolbarButton icon={<AlignRight size={16} />} title="Align Right" />
      </div>

      <div className="flex items-center px-2 gap-1 h-6">
        <ToolbarButton onClick={handleAddImage} icon={<ImageIcon size={16} />} title="Insert Image" />
        <ToolbarButton onClick={handleAddTable} icon={<TableIcon size={16} />} title="Insert Table" />
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon, title, onClick, active }: { icon: React.ReactNode, title: string, onClick?: () => void, active?: boolean }) => (
  <button 
    onClick={onClick}
    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-all cursor-pointer ${active ? 'bg-[#d2e3fc] text-[#174ea6]' : 'text-[#444]'}`}
    title={title}
  >
    {icon}
  </button>
);
