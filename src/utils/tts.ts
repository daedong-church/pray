'use client';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let resumeTimer: NodeJS.Timeout | null = null;
let isStopRequested = false;
let isPausedState = false;
let isSpeakingState = false;

function setupSynthesisEventHandlers() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  let synthesisPingInterval: NodeJS.Timeout;

  window.speechSynthesis.onvoiceschanged = () => {
    clearInterval(synthesisPingInterval);
    synthesisPingInterval = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      } else {
        clearInterval(synthesisPingInterval);
      }
    }, 5000);
  };
}

setupSynthesisEventHandlers();

// 음성 목록을 가져오는 함수
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    // 이미 음성이 로드되어 있는 경우
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // 음성이 아직 로드되지 않은 경우 이벤트 리스너 등록
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

// 한국어 음성만 필터링
export async function getKoreanVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await getAvailableVoices();
  return voices.filter(voice => 
    voice.lang.includes('ko') || voice.lang.includes('ko-KR')
  );
}

interface TextSegment {
  text: string;
  start: number;
  end: number;
}

// 문단, 문장, 구두점, 줄바꿈까지 포함해서 정확히 분리
function analyzePrayer(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let idx = 0;
  const regex = /([^\n.!?,，。!?]+[.!?,，。!?]?|\n)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const segText = match[0];
    if (segText === '') continue;
    const start = idx;
    const end = idx + segText.length;
    segments.push({ text: segText, start, end });
    idx = end;
  }
  return segments;
}

export function testVoice(voiceURI?: string) {
  const testText = "안녕하세요";
  return speak(testText, voiceURI, true);
}

export function speak(text: string, voiceURI?: string, isTest: boolean = false) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        throw new Error('이 브라우저는 음성 합성을 지원하지 않습니다.');
      }

      stopSpeaking();
      isStopRequested = false;
      isPausedState = false;
      isSpeakingState = true;

      // 선택된 음성이 Google 음성인지 확인
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.voiceURI === voiceURI);
      const isGoogleVoice = selectedVoice && 
        (selectedVoice.name.toLowerCase().includes('google') || 
         selectedVoice.voiceURI.toLowerCase().includes('google'));

      const sentences = isTest ? [text] : text.split(/([.!?。]\s+|\n+)/g).filter(Boolean);
      
      for (const sentence of sentences) {
        if (isStopRequested) break;

        await new Promise<void>((resolveUtterance, rejectUtterance) => {
          // 텍스트 전처리 적용
          const processedText = analyzePrayer(sentence.trim());
          const utterance = new SpeechSynthesisUtterance(processedText);
          currentUtterance = utterance;
          
          utterance.lang = 'ko-KR';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (voiceURI && voices.length > 0) {
            const selectedVoice = voices.find(voice => voice.voiceURI === voiceURI);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }

          utterance.onend = () => {
            resolveUtterance();
          };

          utterance.onerror = (event) => {
            console.error('음성 합성 오류:', event);
            rejectUtterance(new Error('음성 합성 중 오류가 발생했습니다.'));
          };

          window.speechSynthesis.speak(utterance);
        });

        while (isPausedState && !isStopRequested) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!isTest && !isStopRequested) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (!isStopRequested && !isPausedState) {
        isSpeakingState = false;
      }
      resolve();
    } catch (error) {
      console.error('음성 재생 오류:', error);
      isSpeakingState = false;
      reject(error);
    }
  });
}

export function stopSpeaking() {
  isStopRequested = true;
  isPausedState = false;
  isSpeakingState = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.error('음성 취소 중 오류:', e);
    }
  }
  if (resumeTimer) {
    clearInterval(resumeTimer);
    resumeTimer = null;
  }
  currentUtterance = null;
}

export function pauseSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.pause();
    isPausedState = true;
    isSpeakingState = true;
    
    // 일시정지 타이머가 있다면 제거
    if (resumeTimer) {
      clearInterval(resumeTimer);
      resumeTimer = null;
    }
  }
}

export function resumeSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.resume();
    isPausedState = false;
    isSpeakingState = true;
    
    // Chrome에서 일시정지 후 resume 함수 호출이 제대로 작동하지 않는 문제를 해결하기 위한 추가 코드
    if (resumeTimer) {
      clearInterval(resumeTimer);
    }
    
    resumeTimer = setInterval(() => {
      if (isPausedState === false && isSpeakingState === true) {
        window.speechSynthesis.resume();
      } else {
        if (resumeTimer) {
          clearInterval(resumeTimer);
          resumeTimer = null;
        }
      }
    }, 1000);
  }
}

export function isSpeaking() {
  return isSpeakingState;
}

export function isPaused() {
  return isPausedState;
}

export function speakWithSentenceHighlight(
  text: string,
  voiceURI: string | undefined,
  onSentenceChange: (start: number, end: number) => void
) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        throw new Error('이 브라우저는 음성 합성을 지원하지 않습니다.');
      }

      stopSpeaking();
      isStopRequested = false;
      isPausedState = false;
      isSpeakingState = true;

      const segments = analyzePrayer(text);

      for (const segment of segments) {
        if (isStopRequested) break;

        // 줄바꿈(\n)은 하이라이트 없이 잠시 쉬기만
        if (segment.text === '\n') {
          onSentenceChange(-1, -1);
          await new Promise(resolve => setTimeout(resolve, 400));
          continue;
        }

        // 하이라이트
        onSentenceChange(segment.start, segment.end);

        await new Promise<void>((resolveUtterance) => {
          const utterance = new SpeechSynthesisUtterance(segment.text);
          utterance.lang = 'ko-KR';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          const voices = window.speechSynthesis.getVoices();
          if (voiceURI && voices.length > 0) {
            const selectedVoice = voices.find(voice => voice.voiceURI === voiceURI);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }

          utterance.onstart = () => {
            onSentenceChange(segment.start, segment.end);
          };

          utterance.onend = () => {
            resolveUtterance();
          };

          utterance.onerror = (event) => {
            console.error('음성 합성 오류:', event);
            resolveUtterance();
          };

          window.speechSynthesis.speak(utterance);
        });

        // 문장 사이 짧은 간격
        if (!isStopRequested) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      onSentenceChange(-1, -1);
      isSpeakingState = false;
      resolve();

    } catch (error) {
      console.error('음성 재생 오류:', error);
      onSentenceChange(-1, -1);
      isSpeakingState = false;
      reject(error);
    }
  });
}