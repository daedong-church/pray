interface PrintPrayerProps {
  prayer: string;
  serviceType: string;
  style: string;
  audience: string;
  length: number;
}

export function printPrayer({ prayer, serviceType, style, audience, length }: PrintPrayerProps) {
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

  // 파일명 생성
  const filename = `${currentDate} | ${serviceTypeKo} | ${styleKo} | ${audienceKo} | ${length}분`;

  // 출력용 HTML 생성
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <style>
        @media print {
          @page {
            margin: 2.54cm;
          }
        }
        body {
          font-family: "바탕", Batang, serif;
          line-height: 1.8;
          margin: 0;
          padding: 20px;
        }
        .filename {
          font-size: 14pt;
          margin-bottom: 30px;
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 10px;
        }
        .prayer {
          white-space: pre-wrap;
          font-size: 12pt;
        }
      </style>
    </head>
    <body>
      <div class="filename">${filename}</div>
      <div class="prayer">${prayer}</div>
    </body>
    </html>
  `;

  // 새 창 열기
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // 문서 로드 완료 후 인쇄 다이얼로그 표시
    printWindow.onload = function() {
      printWindow.print();
      // 인쇄 다이얼로그가 닫힐 때 창을 닫지 않음 (사용자가 직접 닫을 수 있도록)
    };
  }
} 