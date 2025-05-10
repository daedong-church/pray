'use client';

declare interface FileSystemSaveOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}

import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface Window {
  showSaveFilePicker?: (options: FileSystemSaveOptions) => Promise<FileSystemFileHandle>;
}

interface SaveToWordParams {
  prayer: string;
  serviceType: string;
  style: string;
  audience: string;
  length: number;
}

export async function saveToWord({
  prayer,
  serviceType,
  style,
  audience,
  length
}: SaveToWordParams): Promise<boolean> {
  // Word 문서 구성
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: '📄 기도문',
                bold: true,
                size: 28, // 14pt
              }),
              new TextRun('\n\n'),
              new TextRun({
                text: `예배 종류: ${serviceType}\n스타일: ${style}\n대상자: ${audience}\n길이: ${length}분\n\n`,
                size: 20,
              }),
              new TextRun({
                text: prayer,
                size: 24, // 12pt
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Word 파일을 blob으로 변환
  const blob = await Packer.toBlob(doc);

  // 최신 브라우저: 파일 저장 다이얼로그
  if ('showSaveFilePicker' in window) {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: '기도문.docx',
      types: [{
        description: 'Word Document',
        accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
      }]
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } else {
    // 구형 브라우저: 자동 다운로드
    saveAs(blob, '기도문.docx');
  }

  return true;
}
