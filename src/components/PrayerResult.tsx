import { Box, Button, IconButton, Select, MenuItem, FormControl, InputLabel, Tooltip } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SaveIcon from '@mui/icons-material/Save';

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

  useEffect(() => {
    setEditedPrayer(prayer);
  }, [prayer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpeechSynthesis(window.speechSynthesis);
    }
  }, []);

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

    if (isPlaying) {
      speechSynthesis.pause();
      setIsPlaying(false);
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
      const sentences = splitSentences(editedPrayer);
      let currentIndex = 0;

      const speakNextSentence = () => {
        if (currentIndex >= sentences.length) {
          setIsPlaying(false);
          setCurrentHighlight(-1);
          return;
        }

        // 모바일에서는 Web Speech API만 사용
        const utterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // 모바일이 아닐 때만 추가 음성 선택
        if (!isMobile) {
          const voices = speechSynthesis.getVoices();
          const koreanVoice = voices.find(voice => 
            voice.lang.includes('ko') && 
            (selectedTTS === 'microsoft' ? voice.name.includes('Microsoft') :
             selectedTTS === 'google' ? voice.name.includes('Google') : true)
          );
          if (koreanVoice) {
            utterance.voice = koreanVoice;
          }
        }

        utterance.onend = () => {
          currentIndex++;
          setCurrentHighlight(currentIndex);
          speakNextSentence();
        };

        utterance.onerror = (event) => {
          console.error('TTS 오류:', event);
          alert('음성 재생 중 오류가 발생했습니다.');
          setIsPlaying(false);
          setCurrentHighlight(-1);
        };

        setCurrentHighlight(currentIndex);
        speechSynthesis.speak(utterance);
      };

      speakNextSentence();
      setIsPlaying(true);
    }
  };

  const stopTTS = () => {
    if (!speechSynthesis) return;

    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentHighlight(-1);
    setIsExpanded(false);
  };

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
                disabled={isMobile}
              >
                <MenuItem value="web">Web Speech API</MenuItem>
                {!isMobile && (
                  <>
                    <MenuItem value="microsoft">Microsoft Edge TTS</MenuItem>
                    <MenuItem value="google">Google Translate TTS</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: { xs: 'center', sm: 'flex-start' },
              gap: 0.5 
            }}>
              <Tooltip title="TTS 재생">
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
