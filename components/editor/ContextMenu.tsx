import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bold, Italic, Underline, Copy, Scissors, Clipboard, Undo, Redo } from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu = ({ x, y, onClose }: ContextMenuProps) => {
  const { 
    undo, redo, toggleSelectionStyle, selection 
  } = useEditorStore();
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const [adjustedPos, setAdjustedPos] = React.useState({ left: x, top: y });

  React.useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let left = x;
      let top = y;

      if (x + rect.width > window.innerWidth) {
        left = x - rect.width;
      }
      if (y + rect.height > window.innerHeight) {
        top = y - rect.height;
      }

      setAdjustedPos({ left, top });
    }
  }, [x, y]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const hasSelection = !!selection && (
    selection.anchor.blockIndex !== selection.focus.blockIndex ||
    selection.anchor.runIndex !== selection.focus.runIndex ||
    selection.anchor.offset !== selection.focus.offset
  );

  const menuItems = [
    { 
      label: 'Undo', 
      icon: <Undo size={14} />, 
      action: undo,
      shortcut: 'Ctrl+Z'
    },
    { 
      label: 'Redo', 
      icon: <Redo size={14} />, 
      action: redo,
      shortcut: 'Ctrl+Y'
    },
    { divider: true },
    { 
      label: 'Cut', 
      icon: <Scissors size={14} />, 
      action: () => {
        document.execCommand('cut');
      },
      shortcut: 'Ctrl+X',
      disabled: !hasSelection
    },
    { 
      label: 'Copy', 
      icon: <Copy size={14} />, 
      action: () => {
        document.execCommand('copy');
      },
      shortcut: 'Ctrl+C',
      disabled: !hasSelection
    },
    { 
      label: 'Paste', 
      icon: <Clipboard size={14} />, 
      action: async () => {
        try {
          const text = await navigator.clipboard.readText();
          // For now, trigger a manual input event or simulate paste
          // Real paste would require more complex handling in our engine
          alert('Paste feature integration in progress');
        } catch (err) {
          console.error('Paste failed', err);
        }
      },
      shortcut: 'Ctrl+V'
    },
    { divider: true },
    { 
      label: 'Bold', 
      icon: <Bold size={14} />, 
      action: () => toggleSelectionStyle({ fontWeight: 'bold' }),
      shortcut: 'Ctrl+B',
      disabled: !hasSelection
    },
    { 
      label: 'Italic', 
      icon: <Italic size={14} />, 
      action: () => toggleSelectionStyle({ fontStyle: 'italic' }),
      shortcut: 'Ctrl+I',
      disabled: !hasSelection
    },
    { 
      label: 'Underline', 
      icon: <Underline size={14} />, 
      action: () => toggleSelectionStyle({ textDecoration: 'underline' }),
      shortcut: 'Ctrl+U',
      disabled: !hasSelection
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-50 bg-white border border-[#dadce0] rounded-lg shadow-xl py-1 min-w-[220px]"
        style={{ left: adjustedPos.left, top: adjustedPos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, idx) => (
          item.divider ? (
            <div key={idx} className="h-px bg-[#dadce0] my-1 mx-1" />
          ) : (
            <button
              key={idx}
              disabled={item.disabled}
              className={`w-full px-3 py-1.5 flex items-center gap-3 text-sm transition-colors
                ${item.disabled 
                  ? 'text-gray-300 cursor-not-allowed opacity-50' 
                  : 'text-gray-700 hover:bg-[#f1f3f4] cursor-default'
                }
              `}
              onClick={() => !item.disabled && handleAction(item.action!)}
            >
              <span className="text-gray-500 w-4 h-4 flex items-center">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px] text-gray-400 font-medium">{item.shortcut}</span>
              )}
            </button>
          )
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
