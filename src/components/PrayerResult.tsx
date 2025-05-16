import { Box, Button, IconButton, Select, MenuItem, FormControl, InputLabel, Tooltip } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SaveIcon from '@mui/icons-material/Save';

// 버전 정보
const VERSION = '1.0.0';

declare global {
  interface Window {
    lastPauseTime?: number;
    webkitSpeechSynthesis?: SpeechSynthesis;
  }
}

interface PrayerResultProps {
  prayer: string;
  onEdit: () => void;
  onSave: (editedContent: string) => void;
  onPrint: () => void;
  onSaveToWord: () => void;
  onTTS: () => void;
  onSaveToPrayerList: () => void;
}

// TTS 서비스 타입 정의
type TTSService = 'web' | 'microsoft' | 'google';

export default function PrayerResult({
  prayer,
  onEdit,
  onSave,
  onPrint,
  onSaveToWord,
  onTTS,
  onSaveToPrayerList,
}: PrayerResultProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrayer, setEditedPrayer] = useState(prayer);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<number>(-1);
  const [selectedTTS, setSelectedTTS] = useState<TTSService>('web');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const isPausedRef = useRef<boolean>(false);
  const sentencesRef = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // 버그 해결을 위한 추가 상태들
  const pauseTimeRef = useRef<number>(0);
  const ttsRetryCountRef = useRef<number>(0);
  const maxRetries = 3; // 최대 재시도 횟수

  useEffect(() => {
    setEditedPrayer(prayer);
  }, [prayer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Chrome/Safari/Edge에서 SpeechSynthesis 객체 확인
      const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
      
      if (!synth) {
        console.error('이 브라우저는 Web Speech API를 지원하지 않습니다.');
        return;
      }
      
      setSpeechSynthesis(synth);

      // 음성 목록 가져오기
      const loadVoices = () => {
        const availableVoices = synth.getVoices();
        console.log(`사용 가능한 음성 ${availableVoices.length}개 로드됨`);
        setVoices(availableVoices);
      };

      // Chrome에서는 voiceschanged 이벤트를 사용해야 함
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }
      
      // 일부 브라우저에서는 voiceschanged 이벤트가 발생하지 않을 수 있음
      loadVoices();
      
      // 1초 후 한 번 더 시도 (일부 브라우저에서 지연 로딩되는 경우 대비)
      setTimeout(loadVoices, 1000);

      // SpeechSynthesis는 페이지를 15초 이상 읽으면 자동으로 멈추는 버그가 있음
      // 이를 방지하기 위한 주기적인 재시작 메커니즘
      const resumeInterval = setInterval(() => {
        if (isPlaying && !isPausedRef.current && synth) {
          if (!synth.speaking) {
            console.log('SpeechSynthesis 자동 멈춤 감지');
            
            // 말하기가 자동으로 멈췄다면 다시 시작
            if (currentIndexRef.current >= 0 && currentIndexRef.current < sentencesRef.current.length) {
              console.log('중단된 위치에서 재시작 시도');
              speakNextSentence(sentencesRef.current, currentIndexRef.current);
            }
          }
        }
      }, 5000);

      // 페이지를 떠날 때 TTS 정리
      return () => {
        if (synth) {
          synth.cancel();
        }
        clearInterval(resumeInterval);
      };
    }
  }, []);

  // TTS 서비스 변경 시 음성 목록 다시 로드
  useEffect(() => {
    if (speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        console.log('Available voices after TTS change:', availableVoices); // 디버깅용
        setVoices(availableVoices);
      };
      loadVoices();
    }
  }, [selectedTTS]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
    onEdit();
  };

  const handleSave = () => {
    setIsEditing(false);
    setIsExpanded(false);
    onSave(editedPrayer);
  };

  const splitSentences = (text: string): string[] => {
    const paragraphs = text.split(/\n\s*\n/);
    const result: string[] = [];

    paragraphs.forEach(paragraph => {
      const parts = paragraph
        .split(/([,.])/g)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (let i = 0; i < parts.length; i += 2) {
        const sentence = parts[i];
        const punctuation = parts[i + 1] || '';
        result.push(sentence + punctuation);
      }
    });

    return result;
  };

  // TTS 서비스별 재생 함수
  const playTTS = () => {
    if (!speechSynthesis) {
      alert('이 브라우저는 음성 합성을 지원하지 않습니다.');
      return;
    }

    // 재생 중인 경우 일시정지
    if (isPlaying) {
      try {
        if (isMobile) {
          // 모바일에서는 cancel()을 사용하여 일시정지
          speechSynthesis.cancel();
          isPausedRef.current = true;
          setIsPlaying(false);
        } else {
          speechSynthesis.pause();
          isPausedRef.current = true;
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('TTS 일시정지 중 오류:', error);
      }
      return;
    }

    // 일시정지 상태에서 재생
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPlaying(true);
      if (currentIndexRef.current >= 0) {
        speakNextSentence(sentencesRef.current, currentIndexRef.current);
      }
      return;
    }

    // 새로운 재생 시작
    resetTTSState();
    const sentences = splitSentences(editedPrayer);
    sentencesRef.current = sentences;
    currentIndexRef.current = -1;
    setIsPlaying(true);
    speakNextSentence(sentences, 0);
  };

  const speakNextSentence = (sentences: string[], startIndex: number) => {
    if (!speechSynthesis || startIndex >= sentences.length) {
      resetTTSState();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(sentences[startIndex]);
      utteranceRef.current = utterance;

      // 음성 설정
      if (selectedTTS === 'web') {
        const koreanVoice = voices.find(voice => 
          voice.lang.includes('ko') && voice.name.includes('Neural')
        ) || voices.find(voice => voice.lang.includes('ko'));

        if (koreanVoice) {
          utterance.voice = koreanVoice;
        }
      }

      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 이벤트 핸들러
      utterance.onstart = () => {
        setCurrentHighlight(startIndex);
        currentIndexRef.current = startIndex;
        scrollToHighlightedText();
      };

      utterance.onend = () => {
        if (!isPausedRef.current) {
          speakNextSentence(sentences, startIndex + 1);
        }
      };

      utterance.onerror = (event) => {
        console.error('TTS 오류:', event);
        if (ttsRetryCountRef.current < maxRetries) {
          ttsRetryCountRef.current++;
          setTimeout(() => {
            speakNextSentence(sentences, startIndex);
          }, 1000);
        } else {
          resetTTSState();
        }
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('TTS 재생 중 오류:', error);
      resetTTSState();
    }
  };

  const resetTTSState = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    setIsPlaying(false);
    isPausedRef.current = false;
    currentIndexRef.current = -1;
    setCurrentHighlight(-1);
    pauseTimeRef.current = 0;
    ttsRetryCountRef.current = 0;
    utteranceRef.current = null;
  };

  const stopTTS = () => {
    if (!speechSynthesis) return;
    
    try {
      console.log('TTS 중지');
      speechSynthesis.cancel();
      resetTTSState();
      // 문장 배열 초기화 - 중지 후 다시 시작할 때 처음부터 시작하기 위함
      sentencesRef.current = [];
    } catch (error) {
      console.error('TTS 중지 오류:', error);
      resetTTSState();
      sentencesRef.current = [];
    }
  };

  // 15초마다 SpeechSynthesis 상태를 확인하고 문제가 있으면 재설정
  useEffect(() => {
    if (!speechSynthesis) return;

    const intervalId = setInterval(() => {
      // 재생 중이지만 SpeechSynthesis가 말하지 않는 경우 (버그 상황)
      if (isPlaying && !speechSynthesis.speaking && !isPausedRef.current) {
        speakNextSentence(sentencesRef.current, currentIndexRef.current);
      }
      // 일시정지 상태에서 15초 이상 지속되면 자동 재설정
      if (isPausedRef.current) {
        const pauseDuration = Date.now() - ((window as any).lastPauseTime ?? 0);
        if (pauseDuration > 60000) {
          resetTTSState();
        }
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isPlaying, speechSynthesis]);

  // 일시정지 시간 추적
  useEffect(() => {
    if (isPausedRef.current) {
      (window as any).lastPauseTime = Date.now();
    }
  }, [isPausedRef.current]);

  const scrollToHighlightedText = () => {
    if (currentHighlight === -1) return;

    const highlightedElement = document.querySelector(`[data-sentence-index="${currentHighlight}"]`);
    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  useEffect(() => {
    scrollToHighlightedText();
  }, [currentHighlight]);

  // 브라우저 visibility 변경 이벤트 처리
  useEffect(() => {
    // 탭 전환 및 복구 처리 (TTS 오작동 방지)
    const handleVisibilityChange = () => {
      if (!speechSynthesis) return;
      
      // 브라우저가 숨겨지면(다른 탭으로 이동 등) 일시정지
      if (document.visibilityState === 'hidden') {
        if (isPlaying) {
          console.log('탭 전환 감지: 일시정지');
          pauseTimeRef.current = Date.now();
          try {
            speechSynthesis.pause();
            isPausedRef.current = true;
            setIsPlaying(false);
          } catch (e) {
            console.error('탭 전환 일시정지 오류:', e);
          }
        }
      } 
      // 브라우저가 다시 보이면(이 탭으로 복귀) 복구 시도
      else if (document.visibilityState === 'visible') {
        // 일시정지된 상태였고 30초 이내면 재개 시도
        if (isPausedRef.current && (Date.now() - pauseTimeRef.current < 30000)) {
          console.log('탭 복귀 감지: 재생 복구 시도');
          
          // 약간의 지연 후 재생 (브라우저가 완전히 활성화될 시간 제공)
          setTimeout(() => {
            try {
              // 말하고 있지 않으면 명시적으로 재시작
              if (!speechSynthesis.speaking) {
                console.log('복귀 후 재시작 필요: 현재 문장부터 재시작');
                isPausedRef.current = false;
                speakNextSentence(sentencesRef.current, currentIndexRef.current);
                setIsPlaying(true);
              } else {
                console.log('복귀 후 재개');
                speechSynthesis.resume();
                isPausedRef.current = false;
                setIsPlaying(true);
              }
            } catch (e) {
              console.error('탭 복귀 후 재개 오류:', e);
              
              // 오류 발생 시 현재 위치에서 명시적 재시작
              isPausedRef.current = false;
              speakNextSentence(sentencesRef.current, currentIndexRef.current);
              setIsPlaying(true);
            }
          }, 300);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, speechSynthesis]);

  const convertToHtml = (text: string) => {
    const paragraphs = text.split(/\n\s*\n/); // 문단 기준 분리
    let globalIndex = 0;
    let html = '';

    paragraphs.forEach((paragraph) => {
      const parts = paragraph
        .split(/([,.])/g)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      let paragraphHtml = '';

      for (let i = 0; i < parts.length; i += 2) {
        const sentence = parts[i];
        const punctuation = parts[i + 1] || '';
        const fullSentence = sentence + punctuation;

        const isHighlighted = globalIndex === currentHighlight;
        const style = isHighlighted ? 'background-color: #ffeb3b;' : '';

        const sentenceHtml = fullSentence
          .replace(/## (.*)/g, '<h2 style="color: #1976d2; font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 1rem;">$1</h2>')
          .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em style="color: #666;">$1</em>')
          .replace(/> (.*)/g, '<blockquote style="border-left: 4px solid #90caf9; padding-left: 1rem; margin: 1rem 0; background-color: #f5f5f5;"><p style="margin: 0.5rem 0;">$1</p></blockquote>');
    
        paragraphHtml += `<span data-sentence-index="${globalIndex}" style="${style}">${sentenceHtml}</span> `;
        globalIndex++;
      }

      html += `<p style="margin: 1rem 0;">${paragraphHtml.trim()}</p>`;
    });
    
    return html;
  };

  // 녹음 시작 함수
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('녹음을 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
    }
  };

  // 녹음 중지 함수
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // 녹음 파일 저장 함수
  const saveRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `기도문_녹음_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mt: 2, 
          mb: 3,
          height: { xs: '300px', sm: '400px', md: '500px' },
          transition: 'height 0.3s ease-in-out',
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: { xs: 2, sm: 3 },
          backgroundColor: '#fff',
          fontFamily: '"나눔명조", serif',
          fontSize: { xs: '0.9rem', sm: '1rem' },
          lineHeight: 1.8,
          color: 'text.primary',
          '& h2': {
            color: 'primary.main',
            fontSize: { xs: '1.1rem', sm: '1.2rem' },
            fontWeight: 600,
            mt: 3,
            mb: 2,
            '&:first-of-type': {
              mt: 0
            }
          },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'primary.light',
            bgcolor: 'grey.50',
            px: { xs: 1, sm: 2 },
            py: { xs: 0.5, sm: 1 },
            my: { xs: 1, sm: 2 },
          },
          '& p': {
            my: { xs: 1, sm: 1.5 }
          }
        }}
      >
        {isEditing ? (
          <textarea
            value={editedPrayer}
            onChange={(e) => setEditedPrayer(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              padding: '1rem',
              fontSize: '1rem',
              lineHeight: '1.8',
              fontFamily: '"나눔명조", serif',
              resize: 'none',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent'
            }}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              overflow: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: convertToHtml(editedPrayer) }}
          />
        )}
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        gap: { xs: 1, sm: 2 },
        mt: 2 
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0.5 },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Button
            variant="contained"
            size="small"
            onClick={isEditing ? handleSave : handleEdit}
            sx={{ 
              minWidth: { xs: '100%', sm: '80px' },
              height: { xs: 36, sm: 40 }
            }}
          >
            {isEditing ? '수정완료' : '수정하기'}
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={onPrint}
            sx={{ 
              minWidth: { xs: '100%', sm: '80px' },
              height: { xs: 36, sm: 40 }
            }}
          >
            출력하기
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={onSaveToWord}
            sx={{ 
              minWidth: { xs: '100%', sm: '80px' },
              height: { xs: 36, sm: 40 }
            }}
          >
            Word저장
          </Button>
          <Box sx={{ 
            ml: { xs: 0, sm: 3 }, 
            mt: { xs: 1, sm: 0 },
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }, 
            gap: { xs: 1, sm: 0.5 } 
          }}>
            {!isMobile && (
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: { xs: '100%', sm: 120 },
                  height: { xs: 36, sm: 40 }
                }}
              >
                <InputLabel id="tts-select-label">음성(TTS)</InputLabel>
                <Select
                  labelId="tts-select-label"
                  value={selectedTTS}
                  onChange={(e) => setSelectedTTS(e.target.value as TTSService)}
                  size="small"
                  label="음성(TTS)"
                >
                  <MenuItem value="web">Web Speech API</MenuItem>
                  <MenuItem value="microsoft">Microsoft Edge TTS</MenuItem>
                  <MenuItem value="google">Google Translate TTS</MenuItem>
                </Select>
              </FormControl>
            )}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: { xs: 'center', sm: 'flex-start' },
              gap: 0.5 
            }}>
              <Tooltip title={isPlaying ? "일시정지" : "TTS 재생"}>
                <IconButton 
                  onClick={playTTS}
                  color={isPlaying ? "primary" : "default"}
                  size="small"
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="TTS 중지">
                <IconButton 
                  onClick={stopTTS}
                  color="default"
                  size="small"
                >
                  <StopIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ 
            ml: { xs: 0, sm: 2 }, 
            mt: { xs: 1, sm: 0 },
            display: 'flex', 
            justifyContent: { xs: 'center', sm: 'flex-start' },
            alignItems: 'center', 
            gap: 0.5 
          }}>
            <Tooltip title={isRecording ? "녹음 중지" : "녹음 시작"}>
              <IconButton 
                onClick={isRecording ? stopRecording : startRecording}
                color={isRecording ? "error" : "default"}
                size="small"
              >
                {isRecording ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
            {audioBlob && (
              <Tooltip title="녹음 파일 저장">
                <IconButton 
                  onClick={saveRecording}
                  color="primary"
                  size="small"
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          size="small"
          onClick={onSaveToPrayerList}
          sx={{ 
            minWidth: { xs: '100%', sm: '100px' },
            height: { xs: 36, sm: 40 },
            mt: { xs: 1, sm: 0 }
          }}
        >
          기도문 저장
        </Button>
      </Box>
    </Box>
  );
}