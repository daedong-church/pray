interface SaveToWordProps {
  prayer: string;
  serviceType: string;
  style: string;
  audience: string;
  length: number;
}

export async function saveToWord({ prayer, serviceType, style, audience, length }: SaveToWordProps) {
  // 예배 종류 한글 변환
  const serviceTypeKo = {
    'sunday': '주일예배',
    'dawn': '새벽예배',
    'afternoon': '오후예배',
    'wednesday': '수요예배',
    'friday': '금요기도회',
    'christmas': '성탄절',
    'easter': '부활절',
    'thanksgiving': '추수감사절'
  }[serviceType];

  // 스타일 한글 변환
  const styleKo = {
    'traditional': '전통적',
    'modern': '현대적',
    'literary': '문학적'
  }[style];

  // 대상자 한글 변환
  const audienceKo = {
    'believer': '성도',
    'pastor': '목회자',
    'elder': '장로',
    'children': '어린이',
    'youth': '청소년',
    'youngAdult': '청년',
    'adult': '장년'
  }[audience];

  // 현재 날짜
  const currentDate = new Date().toLocaleDateString();

  // 기본 파일명 생성
  const defaultFilename = `${currentDate} | ${serviceTypeKo} | ${styleKo} | ${audienceKo} | ${length}분`;

  // 마크다운을 Word 문서용 HTML로 변환
  const convertToWordHtml = (text: string) => {
    // ## 로 시작하는 헤더를 변환
    let html = text.replace(/## (.*)\n/g, '<h2 style="color: #1976d2; font-size: 16pt; margin-top: 20pt; margin-bottom: 10pt; font-family: \'나눔명조\', serif;">$1</h2>');
    
    // 볼드체 변환 (**텍스트**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #2c3e50;">$1</strong>');
    
    // 이탤릭체 변환 (*텍스트*)
    html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #34495e;">$1</em>');
    
    // 인용구 변환 (> 텍스트)
    html = html.replace(/> (.*)\n/g, '<div style="margin: 15pt 0; padding: 10pt; background-color: #f8f9fa; border-left: 4pt solid #90caf9;"><p style="margin: 0; font-style: italic; color: #34495e;">$1</p></div>');
    
    // 줄바꿈 처리
    html = html.replace(/\n\n/g, '</p><p style="margin: 10pt 0; line-height: 1.8;">');
    html = html.replace(/\n/g, '<br>');
    
    // 전체 텍스트를 p 태그로 감싸기
    html = `<p style="margin: 10pt 0; line-height: 1.8;">${html}</p>`;
    
    return html;
  };

  try {
    // Word 문서 형식의 HTML 생성
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${defaultFilename}</title>
        <style>
          @page {
            size: A4;
            margin: 2.54cm;
          }
          body {
            font-family: '나눔명조', serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #2c3e50;
            margin: 0;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30pt;
            padding-bottom: 15pt;
            border-bottom: 1pt solid #e0e0e0;
          }
          .title {
            font-size: 14pt;
            font-weight: normal;
            color: #2c3e50;
            margin: 0;
            padding: 0;
          }
          .date {
            font-size: 10pt;
            color: #666;
            margin-top: 5pt;
          }
          .content {
            margin: 0;
            padding: 0 15pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${defaultFilename}</h1>
          <div class="date">${new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}</div>
        </div>
        <div class="content">
          ${convertToWordHtml(prayer)}
        </div>
      </body>
      </html>
    `;

    // 파일 저장 다이얼로그 표시
    const handle = await window.showSaveFilePicker({
      suggestedName: `${defaultFilename}.doc`,
      types: [{
        description: 'Word Document',
        accept: {
          'application/msword': ['.doc']
        }
      }],
    });

    // 파일 쓰기
    const writable = await handle.createWritable();
    await writable.write(html);
    await writable.close();

    return true;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('파일 저장 중 오류 발생:', error);
      throw new Error('파일 저장 중 오류가 발생했습니다.');
    }
    return false;
  }
} 