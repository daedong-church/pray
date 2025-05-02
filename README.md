# 기도문 생성기 (Prayer Generator)

AI를 활용한 기도문 생성 웹 애플리케이션입니다.

## 주요 기능

- 다양한 예배 종류에 맞는 기도문 생성
- 기도문 구조화 옵션 제공
- 맞춤형 스타일과 대상자 설정
- 길이 조절 기능

## 기술 스택

- Next.js
- TypeScript
- OpenAI API

## 설치 방법

1. 저장소 클론
```bash
git clone https://github.com/[your-username]/pray.git
cd pray
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가:
```
OPENAI_API_KEY=your_api_key_here
```

4. 개발 서버 실행
```bash
npm run dev
```

## 사용 방법

1. 웹 브라우저에서 `http://localhost:3000` 접속
2. 기도문 생성 옵션 설정
3. '생성하기' 버튼 클릭

## 라이선스

MIT License 