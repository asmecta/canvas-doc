'use client';

import React, { useRef } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Table as TableIcon, Type, Undo, Redo,
  ChevronDown, Download, Upload, History, Save, List, ListOrdered,
  Pipette, Highlighter, ListTree, Languages
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { ElementType, ParagraphType } from '@/lib/editor/types';
import { useEditorExport } from '@/lib/editor/export';

export const Toolbar = () => {
  const { 
    elements, selection, undo, redo, addElement, insertElement,
    setHistoryOpen, saveVersion, toggleSelectionStyle,
    updateSelectionBlockProperty, showAuxiliaryMarks, setShowAuxiliaryMarks
  } = useEditorStore();
  const { exportToPDF, exportToDOCX, importFromTXT, importFromDOCX } = useEditorExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive current style from selection for toolbar feedback
  const currentStyle = React.useMemo(() => {
    if (!selection) return {};
    const start = selection.isBackward ? selection.focus : selection.anchor;
    const block = elements[start.blockIndex];
    if (block && block.type === ElementType.TEXT) {
      return block.runs[start.runIndex]?.style || {};
    }
    return {};
  }, [elements, selection]);

  const currentBlock = React.useMemo(() => {
    if (!selection) return null;
    const start = selection.isBackward ? selection.focus : selection.anchor;
    return elements[start.blockIndex] as any;
  }, [elements, selection]);

  const handleAddImage = () => {
    insertElement({
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

  const fonts = ['Inter', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72];

  return (
    <div className="h-10 flex items-center px-3 bg-[#edf2fa] mx-4 my-2 rounded-full border border-[#dadce0] shrink-0 gap-1 shadow-sm sticky top-0 z-50 overflow-x-auto">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".docx,.txt" 
        className="hidden" 
      />

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6 text-gray-600">
        <ToolbarButton onClick={undo} icon={<Undo size={16} />} title="Undo (Ctrl+Z)" />
        <ToolbarButton onClick={redo} icon={<Redo size={16} />} title="Redo (Ctrl+Y)" />
        <ToolbarButton onClick={() => setHistoryOpen(true)} icon={<History size={16} />} title="Version History" />
        <ToolbarButton onClick={handleSaveVersion} icon={<Save size={16} />} title="Save Version" />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6">
        <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />} title="Import (.docx, .txt)" />
        <ToolbarButton onClick={handleExportPDF} icon={<Download size={16} />} title="Export PDF" />
        <ToolbarButton onClick={exportToDOCX} icon={<div className="text-[10px] font-bold">DOCX</div>} title="Export DOCX" />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-1 h-6 shrink-0">
        <select 
          className="bg-transparent text-[11px] font-medium outline-none cursor-pointer hover:bg-gray-200 rounded px-1 max-w-[100px] truncate"
          value={currentStyle.fontFamily || 'Inter'}
          onChange={(e) => toggleSelectionStyle({ fontFamily: e.target.value })}
        >
          {fonts.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <select 
          className="bg-transparent text-[11px] font-medium outline-none cursor-pointer hover:bg-gray-200 rounded px-1"
          value={currentStyle.fontSize || 16}
          onChange={(e) => toggleSelectionStyle({ fontSize: parseInt(e.target.value) })}
        >
          {fontSizes.map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6 shrink-0">
        <ToolbarButton 
          onClick={() => toggleSelectionStyle({ fontWeight: 'bold' })} 
          active={currentStyle.fontWeight === 'bold'}
          icon={<Bold size={16} />} 
          title="Bold (Ctrl+B)" 
        />
        <ToolbarButton 
          onClick={() => toggleSelectionStyle({ fontStyle: 'italic' })} 
          active={currentStyle.fontStyle === 'italic'}
          icon={<Italic size={16} />} 
          title="Italic (Ctrl+I)" 
        />
        <ToolbarButton 
          onClick={() => toggleSelectionStyle({ textDecoration: 'underline' })} 
          active={currentStyle.textDecoration === 'underline'}
          icon={<Underline size={16} />} 
          title="Underline (Ctrl+U)" 
        />
        <ToolbarButton 
          onClick={() => toggleSelectionStyle({ textDecoration: 'line-through' })} 
          active={currentStyle.textDecoration === 'line-through'}
          icon={<div className="scale-90 line-through font-bold">abc</div>} 
          title="Strikethrough" 
        />
        <div className="flex flex-col items-center justify-center -space-y-1 hover:bg-gray-200 rounded px-1 cursor-pointer">
          <input 
            type="color" 
            className="w-4 h-4 opacity-0 absolute cursor-pointer"
            onChange={(e) => toggleSelectionStyle({ color: e.target.value })}
          />
          <Pipette size={14} className="text-[#444]" />
          <div className="w-4 h-[2px]" style={{ backgroundColor: currentStyle.color || '#000' }} />
        </div>
        <div className="flex flex-col items-center justify-center -space-y-1 hover:bg-gray-200 rounded px-1 cursor-pointer ml-1">
          <input 
            type="color" 
            className="w-4 h-4 opacity-0 absolute cursor-pointer"
            onChange={(e) => toggleSelectionStyle({ backgroundColor: e.target.value })}
          />
          <Highlighter size={14} className="text-[#444]" />
          <div className="w-4 h-[2px]" style={{ backgroundColor: currentStyle.backgroundColor || 'transparent' }} />
        </div>
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6 shrink-0">
        <select 
          className="bg-transparent text-[11px] font-medium outline-none cursor-pointer hover:bg-gray-200 rounded px-1"
          value={currentBlock?.paragraphType || ParagraphType.NORMAL}
          onChange={(e) => updateSelectionBlockProperty({ paragraphType: e.target.value as ParagraphType })}
        >
          <option value={ParagraphType.NORMAL}>Normal Text</option>
          <option value={ParagraphType.HEADING_1}>Heading 1</option>
          <option value={ParagraphType.HEADING_2}>Heading 2</option>
          <option value={ParagraphType.HEADING_3}>Heading 3</option>
        </select>
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6 shrink-0">
        <ToolbarButton 
          onClick={() => updateSelectionBlockProperty({ alignment: 'left' })}
          active={currentBlock?.alignment === 'left' || (!currentBlock?.alignment && true)}
          icon={<AlignLeft size={16} />} 
          title="Align Left" 
        />
        <ToolbarButton 
          onClick={() => updateSelectionBlockProperty({ alignment: 'center' })}
          active={currentBlock?.alignment === 'center'}
          icon={<AlignCenter size={16} />} 
          title="Align Center" 
        />
        <ToolbarButton 
          onClick={() => updateSelectionBlockProperty({ alignment: 'right' })}
          active={currentBlock?.alignment === 'right'}
          icon={<AlignRight size={16} />} 
          title="Align Right" 
        />
        <ToolbarButton 
          onClick={() => updateSelectionBlockProperty({ alignment: 'justify' })}
          active={currentBlock?.alignment === 'justify'}
          icon={<AlignJustify size={16} />} 
          title="Justify" 
        />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-0.5 h-6 shrink-0">
        <ToolbarButton 
          onClick={() => updateSelectionBlockProperty({ paragraphType: currentBlock?.paragraphType === ParagraphType.BULLET_LIST ? ParagraphType.NORMAL : ParagraphType.BULLET_LIST })}
          active={currentBlock?.paragraphType === ParagraphType.BULLET_LIST}
          icon={<List size={16} />} 
          title="Bullet List" 
        />
        <ToolbarButton 
          onClick={() => updateSelectionBlockProperty({ paragraphType: currentBlock?.paragraphType === ParagraphType.NUMBER_LIST ? ParagraphType.NORMAL : ParagraphType.NUMBER_LIST })}
          active={currentBlock?.paragraphType === ParagraphType.NUMBER_LIST}
          icon={<ListOrdered size={16} />} 
          title="Numbered List" 
        />
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarButton 
          onClick={() => setShowAuxiliaryMarks(!showAuxiliaryMarks)}
          active={showAuxiliaryMarks}
          icon={<span className="font-mono text-xs">¶</span>} 
          title="Show/Hide Editing Marks" 
        />
      </div>

      <div className="flex items-center px-2 border-r border-[#dadce0] gap-1 h-6 shrink-0">
        <ToolbarButton onClick={handleAddImage} icon={<ImageIcon size={16} />} title="Insert Image" />
        <ToolbarButton onClick={handleAddTable} icon={<TableIcon size={16} />} title="Insert Table" />
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarButton 
          onClick={() => insertElement({ type: ElementType.PAGE_BREAK })} 
          icon={<div className="flex flex-col items-center -space-y-1"><div className="w-3 h-0.5 bg-gray-600"></div><div className="text-[8px] font-bold">PAGE</div></div>} 
          title="Insert Page Break" 
        />
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
