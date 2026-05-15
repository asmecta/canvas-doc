import { create } from 'zustand';
import { EditorElement, ElementType, DEFAULT_PAGE_CONFIG, TextStyle } from './types';

interface Version {
  id: string;
  timestamp: number;
  name: string;
  elements: EditorElement[];
}

interface EditorState {
  elements: EditorElement[];
  selection: {
    start: number;
    end: number;
  } | null;
  history: EditorElement[][];
  historyIndex: number;
  versions: Version[];
  isHistoryOpen: boolean;
  
  // Actions
  setElements: (elements: EditorElement[], skipHistory?: boolean) => void;
  updateElement: (index: number, element: EditorElement) => void;
  addElement: (element: EditorElement) => void;
  undo: () => void;
  redo: () => void;
  saveVersion: (name: string) => void;
  restoreVersion: (versionId: string) => void;
  setHistoryOpen: (open: boolean) => void;
}

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

  setHistoryOpen: (open) => set({ isHistoryOpen: open })
}));
