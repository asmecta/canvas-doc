'use client';

import React from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { History, RotateCcw, Clock, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';

export const VersionHistory = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { versions, restoreVersion } = useEditorStore();

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-[100] border-l border-[#dadce0] flex flex-col"
    >
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#dadce0] bg-gray-50">
        <div className="flex items-center gap-2 text-[#1a73e8] font-semibold text-sm">
          <History size={18} />
          Version History
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {versions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm italic">
            No versions saved yet.
          </div>
        ) : (
          [...versions].reverse().map((version) => (
            <div 
              key={version.id}
              className="group p-3 rounded-lg border border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#f8faff] transition-all cursor-pointer relative"
              onClick={() => {
                if (confirm(`Restore to "${version.name}"? Current unsaved changes will be added to history.`)) {
                  restoreVersion(version.id);
                  onClose();
                }
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-gray-900 group-hover:text-[#1a73e8]">{version.name}</span>
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Clock size={12} />
                {new Date(version.timestamp).toLocaleString()}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                <RotateCcw size={10} /> Restore this version
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-[#dadce0]">
        <p className="text-[10px] text-gray-400 leading-relaxed italic">
          Tip: Major changes are auto-saved as versions. You can also name versions manually to keep track of key milestones.
        </p>
      </div>
    </motion.div>
  );
};
