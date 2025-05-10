import OpenAI from 'openai';

export interface PrayerRequest {
  serviceType: string;
  usePrayerStructure: boolean;
  style: string;
  audience: string;
  specialNotes: string;
  length: number;
  model: string;
}

export async function generatePrayer(apiKey: string, request: PrayerRequest): Promise<string> {
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `
[역할]: 당신은 숙련된 목회자입니다. 

[지시]: 예배용 기도문을 마크다운 형식으로 작성해야 합니다.

[파라미터]:
- 예배종류: ${request.serviceType}
- 기도순서구조: ${request.usePrayerStructure ? '사용' : '미사용'}
- 스타일: ${request.style}
- 대상자: ${request.audience}
- 특이사항: ${request.specialNotes}
- 기도문 길이: ${request.length}분

[파라미터 적용]:
1. 반드시 기도문의 작성은 예배종류(${request.serviceType}), 스타일(${request.style}), 대상자(${request.audience})에 맞도록 작성한다.
2. 기도순서구조: ${request.usePrayerStructure ? '사용' : '미사용'} 사용 시 아래 순서에 따라 작성한다.
  예) 찬양→회개→감사→중보(나라, 교회, 성도, 다음 세대)→간구(성도, 선교, 지체, 중직자, 교역자, 설교)→결단
3. 반드시 기도문 길이( ${request.length}분)는 아래와 같은 길이에 맞도록 작성한다.
  예) 1분: 300자, 2분: 600자, 3분: 900자, 4분: 1200자, 5분: 1500자, 6분: 1800자, 7분: 2100자
  - 중보와 간구는 다른 기도 순서보다 3~5배 정도로 길게 기도문 길이를 조절한다.
4. 특이사항: ${request.specialNotes} 특이사항을 내용에 맞게 중보 또는 간구에 포함하여 기도문을 작성한다.

[요구사항]:
- 경건하고, 존경과 겸손이 느껴지는 표현을 사용한다. 
- 기도문은 한국적 정서를 반영하여 작성한다.
- 성경적 언어(예: "주께서 인도하시나이다", "주의 은혜 안에 거하나이다") 적극 활용한다. 
- 찬양, 회개, 감사, 중보, 간구, 결단의 흐름을 자연스럽게 연결한다. 
- 기도문에 여호와의 증인, 신천지, 동일교, 구원파 등의 이단적 사상이나 표현을 일절 포함하지 않습니다.
- 각 기도 순서별로 2~4개 이상 문장 이상 구성하고, 너무 복잡하거나 장황하지 않으며, 은혜롭고 간결하게 작성한다. 
- 전통적 예배 문맥을 고려해 존댓말을 사용한다. 
- 하나님의 위대하심과 은혜를 강조한다. 
- 성도들에게 위로와 도전을 주는 표현 추가한다. 
- 반드시 기도문은 낭독하기 편한 형태로 작성한다.
- 기도문의 제일 위에 기도문의 내용에 부합하는 성경구절(개역개정판)을 포함하되 따움표("")로 구분한다.
- 기도문의 마지막은 반드시 "이 모든 말씀, 우리 구주 예수 그리스도의 이름으로 기도드립니다. 아멘."으로 끝내주세요.

[마크다운 형식 요구사항]:
1. 각 기도 섹션(찬양, 회개, 감사 등)은 기도문에 출력하지 않는다.
2. 각 섹션은 빈 줄로 구분한다.
3. HTML 태그를 사용하지 않는다.
4. 순수 마크다운 문법만 사용한다.

`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: request.model,
    });

    return completion.choices[0].message.content || '기도문 생성에 실패했습니다.';
  } catch (error) {
    console.error('Error generating prayer:', error);
    throw new Error('기도문 생성 중 오류가 발생했습니다.');
  }
} 