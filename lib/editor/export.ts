'use client';

import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph as DocxParagraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { EditorElement, ElementType, Run } from './types';
import { useEditorStore } from './store';

export const useEditorExport = () => {
  const { elements, setElements } = useEditorStore();

  const exportToPDF = async (pageElements: HTMLCanvasElement[]) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [794, 1123] // A4
    });

    for (let i = 0; i < pageElements.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = pageElements[i];
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
    }

    pdf.save('Document.pdf');
  };

  const exportToDOCX = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: elements.map(el => {
          if (el.type === ElementType.TEXT) {
            return new DocxParagraph({
              children: el.runs.map(run => new TextRun({
                text: run.text,
                bold: run.style.fontWeight === 'bold' || (typeof run.style.fontWeight === 'number' && run.style.fontWeight >= 700),
                italics: run.style.fontStyle === 'italic',
                underline: run.style.textDecoration === 'underline' ? {} : undefined,
                size: (run.style.fontSize || 16) * 2, // docx uses half-points
                color: run.style.color?.replace('#', '') || '000000',
              }))
            });
          }
          // Images and Tables could be added here too with more logic
          return new DocxParagraph({ children: [new TextRun({ text: '[Element: ' + el.type + ']' })] });
        })
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'Document.docx');
  };

  const importFromTXT = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const paragraphs = text.split('\n').filter(p => p.trim() !== '');
      const newElements: EditorElement[] = paragraphs.map(p => ({
        type: ElementType.TEXT,
        runs: [{ text: p, style: { fontSize: 16 } }]
      }));
      setElements(newElements);
    };
    reader.readAsText(file);
  };

  const importFromDOCX = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    // Simple HTML to our elements conversion
    // In a real app, use a proper DOM parser
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const newElements: EditorElement[] = [];
    tempDiv.childNodes.forEach(node => {
      if (node.nodeName === 'P' || node.nodeName === 'H1' || node.nodeName === 'H2') {
        newElements.push({
          type: ElementType.TEXT,
          runs: [{ text: node.textContent || '', style: { fontSize: node.nodeName === 'P' ? 16 : 24 } }]
        });
      }
    });

    if (newElements.length > 0) {
      setElements(newElements);
    }
  };

  return {
    exportToPDF,
    exportToDOCX,
    importFromTXT,
    importFromDOCX
  };
};
