import { create } from 'zustand';
import { EditorElement, ElementType, DEFAULT_PAGE_CONFIG, TextStyle, Selection, DocumentPosition, Run, ParagraphType } from './types';

interface Version {
  id: string;
  timestamp: number;
  name: string;
  elements: EditorElement[];
}

interface EditorState {
  elements: EditorElement[];
  selection: Selection | null;
  history: EditorElement[][];
  historyIndex: number;
  versions: Version[];
  isHistoryOpen: boolean;
  zoom: number;
  showAuxiliaryMarks: boolean;
  
  // Actions
  setElements: (elements: EditorElement[], skipHistory?: boolean) => void;
  updateElement: (index: number, element: EditorElement) => void;
  addElement: (element: EditorElement) => void;
  undo: () => void;
  redo: () => void;
  saveVersion: (name: string) => void;
  restoreVersion: (versionId: string) => void;
  setHistoryOpen: (open: boolean) => void;
  setSelection: (selection: Selection | null) => void;
  toggleSelectionStyle: (style: Partial<TextStyle>) => void;
  updateSelectionBlockProperty: (props: Partial<{ alignment: any, paragraphType: any, lineHeight: number, indent?: number }>) => void;
  setZoom: (zoom: number) => void;
  setShowAuxiliaryMarks: (show: boolean) => void;
  insertElement: (element: EditorElement) => void;
}

// Helper to merge adjacent runs with same styles
const mergeRuns = (runs: Run[]): Run[] => {
  if (runs.length <= 1) return runs;
  const merged: Run[] = [];
  let currentRun = { ...runs[0] };

  for (let i = 1; i < runs.length; i++) {
    const run = runs[i];
    if (JSON.stringify(run.style) === JSON.stringify(currentRun.style)) {
      currentRun.text += run.text;
    } else {
      if (currentRun.text !== '') merged.push(currentRun);
      currentRun = { ...run };
    }
  }
  if (currentRun.text !== '') merged.push(currentRun);
  return merged;
};

const getBlockOffset = (block: EditorElement, pos: DocumentPosition): number => {
  if (block.type !== ElementType.TEXT) return 0;
  let offset = 0;
  for (let i = 0; i < pos.runIndex; i++) {
    offset += block.runs[i].text.length;
  }
  return offset + pos.offset;
};

const getPosFromBlockOffset = (block: EditorElement, blockIndex: number, blockOffset: number): DocumentPosition => {
  if (block.type !== ElementType.TEXT) return { blockIndex, runIndex: 0, offset: 0 };
  let currentOffset = 0;
  for (let i = 0; i < block.runs.length; i++) {
    const runLength = block.runs[i].text.length;
    if (blockOffset <= currentOffset + runLength) {
      return { blockIndex, runIndex: i, offset: blockOffset - currentOffset };
    }
    currentOffset += runLength;
  }
  return { blockIndex, runIndex: Math.max(0, block.runs.length - 1), offset: block.runs[block.runs.length - 1]?.text.length || 0 };
};

// Note: Using a simple zustand store for now.
// For a real app, I'd use a more sophisticated document model.

export const useEditorStore = create<EditorState>((set) => ({
  elements: [
    {
      type: ElementType.TEXT,
      runs: [
        { text: 'Welcome to ', style: { fontWeight: 'bold', fontSize: 24 } },
        { text: 'CanvasDoc', style: { fontWeight: 'bold', fontSize: 24, color: '#2563eb' } },
      ]
    },
    {
      type: ElementType.TEXT,
      runs: [
        { text: 'This is a high-performance Word editor built entirely on HTML5 Canvas. It supports rich text formatting, images, tables, and multi-page layouts.', style: { fontSize: 16 } }
      ]
    }
  ],
  selection: null,
  history: [],
  historyIndex: -1,
  isHistoryOpen: false,
  zoom: 1,
  showAuxiliaryMarks: false,
  versions: [
    {
      id: 'initial',
      timestamp: Date.now(),
      name: 'Initial Version',
      elements: [
        {
          type: ElementType.TEXT,
          runs: [
            { text: 'Welcome to ', style: { fontWeight: 'bold', fontSize: 24 } },
            { text: 'CanvasDoc', style: { fontWeight: 'bold', fontSize: 24, color: '#2563eb' } },
          ]
        },
        {
          type: ElementType.TEXT,
          runs: [
            { text: 'This is a high-performance Word editor built entirely on HTML5 Canvas. It supports rich text formatting, images, tables, and multi-page layouts.', style: { fontSize: 16 } }
          ]
        }
      ]
    }
  ],

  setElements: (elements, skipHistory = false) => set((state) => {
    if (skipHistory) return { elements };
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements))); // Deep copy
    return {
      elements: JSON.parse(JSON.stringify(elements)),
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  updateElement: (index, element) => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements)));

    const newElements = [...state.elements];
    newElements[index] = JSON.parse(JSON.stringify(element));
    
    return { 
      elements: newElements,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  addElement: (element) => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements)));

    return {
      elements: [...state.elements, JSON.parse(JSON.stringify(element))],
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  undo: () => set((state) => {
    if (state.historyIndex < 0) return state;
    
    const currentElements = JSON.parse(JSON.stringify(state.elements));
    const prevElements = state.history[state.historyIndex];
    
    // We need to keep the redo possibilities
    const newHistory = [...state.history];
    // This is a bit tricky with simple index-based history. 
    // In a real app we'd use a temporal data structure.
    
    return {
      elements: prevElements,
      historyIndex: state.historyIndex - 1
    };
  }),

  redo: () => set((state) => {
    // For standard redo, we'd need a separate redo stack or structured history.
    // In this simple implementation, historyIndex determines where we are.
    // If we're at index X, and there are items at X+1, we can redo.
    // But our history implementation as written only pushes the "current" to history when changing.
    // Let's refine the redo logic.
    return state; // Placeholder for now, simple undo works.
  }),

  saveVersion: (name) => set((state) => ({
    versions: [
      ...state.versions,
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        name,
        elements: JSON.parse(JSON.stringify(state.elements))
      }
    ]
  })),

  restoreVersion: (versionId) => set((state) => {
    const version = state.versions.find(v => v.id === versionId);
    if (!version) return state;
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements)));

    return {
      elements: JSON.parse(JSON.stringify(version.elements)),
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  setSelection: (selection) => set({ selection }),

  toggleSelectionStyle: (style: Partial<TextStyle>) => set((state) => {
    if (!state.selection) return state;

    const start = state.selection.isBackward ? state.selection.focus : state.selection.anchor;
    const end = state.selection.isBackward ? state.selection.anchor : state.selection.focus;

    // Helper to determine if a run is within the selection range
    const isRunInRange = (bIdx: number, rIdx: number) => {
      if (bIdx < start.blockIndex || bIdx > end.blockIndex) return false;
      if (bIdx === start.blockIndex && rIdx < start.runIndex) return false;
      if (bIdx === end.blockIndex && rIdx > end.runIndex) return false;
      return true;
    };

    // Decide if we are adding or removing the style based on the first character
    const firstBlock = state.elements[start.blockIndex];
    let isRemoving = false;
    if (firstBlock.type === ElementType.TEXT) {
      const firstRun = firstBlock.runs[start.runIndex];
      const key = Object.keys(style)[0] as keyof TextStyle;
      if (firstRun.style[key] === style[key]) {
        isRemoving = true;
      }
    }

    const startBlockOffset = getBlockOffset(state.elements[start.blockIndex], start);
    const endBlockOffset = getBlockOffset(state.elements[end.blockIndex], end);

    const newElements = JSON.parse(JSON.stringify(state.elements));

    for (let b = start.blockIndex; b <= end.blockIndex; b++) {
      const block = newElements[b];
      if (block.type !== ElementType.TEXT) continue;

      const runs = block.runs;
      const resultRuns: Run[] = [];
      
      for (let r = 0; r < runs.length; r++) {
        const run = runs[r];
        const isStartBlock = b === start.blockIndex;
        const isEndBlock = b === end.blockIndex;
        const isStartRun = isStartBlock && r === start.runIndex;
        const isEndRun = isEndBlock && r === end.runIndex;

        if (!isRunInRange(b, r)) {
          resultRuns.push(run);
          continue;
        }

        const runStart = isStartRun ? start.offset : 0;
        const runEnd = isEndRun ? end.offset : run.text.length;

        const beforeText = run.text.substring(0, runStart);
        const selectedText = run.text.substring(runStart, runEnd);
        const afterText = run.text.substring(runEnd);

        if (beforeText) resultRuns.push({ text: beforeText, style: { ...run.style } });
        
        if (selectedText) {
          const newStyle = { ...run.style, ...style };
          if (isRemoving) {
            const key = Object.keys(style)[0] as keyof TextStyle;
            delete newStyle[key];
          }
          resultRuns.push({ text: selectedText, style: newStyle });
        }

        if (afterText) resultRuns.push({ text: afterText, style: { ...run.style } });
      }

      block.runs = mergeRuns(resultRuns);
    }

    const firstTransformedBlock = newElements[start.blockIndex];
    const lastTransformedBlock = newElements[end.blockIndex];
    
    const newStartPos = getPosFromBlockOffset(firstTransformedBlock, start.blockIndex, startBlockOffset);
    const newEndPos = getPosFromBlockOffset(lastTransformedBlock, end.blockIndex, endBlockOffset);

    const newSelection: Selection = {
      anchor: state.selection.isBackward ? newEndPos : newStartPos,
      focus: state.selection.isBackward ? newStartPos : newEndPos,
      isBackward: state.selection.isBackward
    };

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements)));

    return {
      elements: newElements,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selection: newSelection
    };
  }),

  updateSelectionBlockProperty: (props) => set((state) => {
    if (!state.selection) return state;

    const start = state.selection.isBackward ? state.selection.focus : state.selection.anchor;
    const end = state.selection.isBackward ? state.selection.anchor : state.selection.focus;

    const newElements = JSON.parse(JSON.stringify(state.elements));
    
    for (let b = start.blockIndex; b <= end.blockIndex; b++) {
      const block = newElements[b];
      if (block.type === ElementType.TEXT) {
        Object.assign(block, props);
        
        // Apply default styles for headings
        if (props.paragraphType) {
          let fontSize = 16;
          let fontWeight: any = 'normal';
          
          if (props.paragraphType === ParagraphType.HEADING_1) { fontSize = 32; fontWeight = 'bold'; }
          else if (props.paragraphType === ParagraphType.HEADING_2) { fontSize = 24; fontWeight = 'bold'; }
          else if (props.paragraphType === ParagraphType.HEADING_3) { fontSize = 18; fontWeight = 'bold'; }
          
          block.runs.forEach((run: Run) => {
            run.style.fontSize = fontSize;
            run.style.fontWeight = fontWeight;
          });
        }
      }
    }

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements)));

    return {
      elements: newElements,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  insertElement: (element) => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.elements)));

    const newElements = [...state.elements];
    let insertIndex = newElements.length;
    let newSelection = state.selection;

    if (state.selection) {
      const pos = state.selection.focus;
      const block = newElements[pos.blockIndex];
      
      if (block.type === ElementType.TEXT) {
        const run = block.runs[pos.runIndex];
        const textBefore = run.text.substring(0, pos.offset);
        const textAfter = run.text.substring(pos.offset);

        const runsBefore = [
          ...block.runs.slice(0, pos.runIndex),
          { ...run, text: textBefore }
        ].filter(r => r.text !== '' || block.runs.length === 1);

        const runsAfter = [
          { ...run, text: textAfter },
          ...block.runs.slice(pos.runIndex + 1)
        ].filter(r => r.text !== '' || block.runs.length === 1);

        newElements[pos.blockIndex] = { ...block, runs: runsBefore };
        newElements.splice(pos.blockIndex + 1, 0, JSON.parse(JSON.stringify(element)));
        newElements.splice(pos.blockIndex + 2, 0, { ...block, runs: runsAfter });
        
        insertIndex = pos.blockIndex + 1;
        const nextTextPos = { blockIndex: pos.blockIndex + 2, runIndex: 0, offset: 0 };
        newSelection = { anchor: nextTextPos, focus: nextTextPos, isBackward: false };
      } else {
        newElements.splice(pos.blockIndex + 1, 0, JSON.parse(JSON.stringify(element)));
        insertIndex = pos.blockIndex + 1;
      }
    } else {
      newElements.push(JSON.parse(JSON.stringify(element)));
    }

    return {
      elements: newElements,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selection: newSelection
    };
  }),

  setZoom: (zoom) => set({ zoom }),

  setShowAuxiliaryMarks: (show) => set({ showAuxiliaryMarks: show }),

  setHistoryOpen: (open) => set({ isHistoryOpen: open })
}));
