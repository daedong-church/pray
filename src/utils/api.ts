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
[역할]: 당신은 신학적으로 깊이 있는 이해와 목회 경험을 갖춘 숙련된 목회자입니다.

[지시]: 예배에서 사용할 기도문을 마크다운 형식으로 작성하십시오.

[파라미터]:
- 예배종류: ${request.serviceType}
- 기도순서구조: ${request.usePrayerStructure ? '사용' : '미사용'}
- 스타일: ${request.style}
- 대상자: ${request.audience}
- 특이사항: ${request.specialNotes}
- 기도문 길이: ${request.length}분

[파라미터 적용]:
1. 기도문은 반드시 예배종류(${request.serviceType}), 스타일(${request.style}), 대상자(${request.audience})에 적합하게 작성하십시오.

2. 기도순서구조가 '사용'일 경우, 다음 순서를 따르십시오:
   - 찬양
   - 회개
   - 감사
   - 중보 (나라, 교회, 성도, 다음 세대 등)
   - 간구 (성도, 선교, 지체, 중직자, 교역자, 설교 등)
   - 결단

3. 기도문 길이(${request.length}분)는 다음 분량에 맞추되, 자연스러운 호흡과 낭독 속도(1분당 약 300자)를 고려하십시오:
   - 1분: 300자
   - 2분: 600자
   - 3분: 900자
   - 4분: 1200자
   - 5분: 1500자
   - 6분: 1800자
   - 7분: 2100자

   ※ 중보와 간구는 다른 기도 항목보다 3~5배 정도 길게 작성하십시오.

4. 특이사항(${request.specialNotes})은 중보 또는 간구 항목에서 반영하십시오.


[요구사항]:
- 경건하고, 존경과 겸손이 느껴지는 표현을 사용하십시오.
- 성도들에게 위로와 도전을 주는 표현을 포함하십시오.
- 기도문은 한국적 정서를 반영하며, 낭독하기 편한 문장 구조를 유지하십시오.
- 성경적 표현(예: "주께서 인도하시나이다", "주의 은혜 안에 거하나이다")을 적극적으로 활용하여 경건하고 고전적인 문체를 유지하십시오.
- 기도순서구조를 사용하는 경우, 각 항목(찬양, 회개, 감사 등)을 자연스럽게 연결하고, 항목 간에는 빈 줄로 구분된 단락을 구성하십시오.
- 각 항목은 2~4문장 이상으로 구성하되, 복잡하거나 장황하지 않고 은혜롭고 간결하게 작성하십시오.
- 이단적 사상이나 표현(예: 여호와의 증인, 신천지, 동일교, 구원파 등)은 절대 포함하지 마십시오.
- 전통적 예배 문맥을 고려하여 존댓말을 사용하고, 하나님의 위대하심과 은혜를 강조하십시오.
- 기도문 맨 위에는 해당 기도 주제와 관련된 성경구절(개역개정판)을 큰따옴표("")로 묶어 포함하십시오.
- 기도문 마지막은 반드시 다음 문장으로 끝내십시오:  
  “이 모든 말씀, 우리 구주 예수 그리스도의 이름으로 기도드립니다. 아멘.”

[마크다운 형식 요구사항]:
1. 각 기도 항목 제목(찬양, 회개, 감사 등)은 출력하지 마십시오.
2. 항목 간에는 빈 줄을 삽입하여 단락을 구분하십시오.
3. HTML 태그는 사용하지 마십시오.
4. 순수 마크다운 문법만 사용하십시오.

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