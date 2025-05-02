'use client';

import { Box, Typography, Button, IconButton, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import AudioPlayer from './AudioPlayer';
import { synthesizeSpeech, speak, stopSpeaking, pauseSpeaking, resumeSpeaking, isSpeaking, isPaused, getKoreanVoices, speakWithSentenceHighlight } from '@/utils/tts';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';

interface PrayerResultProps {
  prayer: string;
  onEdit: () => void;
  onSave: (editedContent: string) => void;
  onPrint: () => void;
  onSaveToWord: () => void;
  onSaveToPrayerList: () => void;
}

export default function PrayerResult({
  prayer,
  onEdit,
  onSave,
  onPrint,
  onSaveToWord,
  onSaveToPrayerList,
}: PrayerResultProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrayer, setEditedPrayer] = useState(prayer);
  const [audioContent, setAudioContent] = useState<Uint8Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPausedState, setIsPausedState] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number }>({ start: -1, end: -1 });

  const prayerBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedPrayer(prayer);
  }, [prayer]);

  useEffect(() => {
    function loadVoices() {
      const availableVoices = window.speechSynthesis.getVoices();
      const koreanVoices = availableVoices.filter(voice => 
        voice.lang.includes('ko') || voice.lang.includes('ko-KR')
      );
      
      console.log('사용 가능한 한국어 음성:', koreanVoices);
      setVoices(koreanVoices);
      
      // Google 음성을 찾아서 기본값으로 설정
      const googleVoice = koreanVoices.find(voice => 
        voice.name.toLowerCase().includes('google') || 
        voice.voiceURI.toLowerCase().includes('google')
      );
      
      if (googleVoice && !selectedVoice) {
        setSelectedVoice(googleVoice.voiceURI);
      } else if (koreanVoices.length > 0 && !selectedVoice) {
        // Google 음성이 없는 경우 첫 번째 음성 선택
        setSelectedVoice(koreanVoices[0].voiceURI);
      }
    }

    loadVoices();

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const interval = setInterval(() => {
      setIsPlaying(isSpeaking());
      setIsPausedState(isPaused());
    }, 100);

    return () => {
      clearInterval(interval);
      stopSpeaking();
    };
  }, []);

  // 기도문이 바뀌면 하이라이트 초기화
  useEffect(() => {
    setHighlightRange({ start: -1, end: -1 });
  }, [prayer]);

  // 하이라이트된 글자가 보이도록 스크롤
  useEffect(() => {
    if (highlightRange.start >= 0) {
      const el = document.getElementById(`char-${highlightRange.start}`);
      if (el && prayerBoxRef.current) {
        const container = prayerBoxRef.current;
        const elTop = el.offsetTop;
        const containerTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        if (elTop < containerTop || elTop > containerTop + containerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [highlightRange]);

  const handleEdit = () => {
    setIsEditing(true);
    onEdit();
  };

  const handleSave = () => {
    setIsEditing(false);
    onSave(editedPrayer);
  };

  const handleTTS = async () => {
    try {
      const content = await synthesizeSpeech(editedPrayer);
      setAudioContent(content);
    } catch (error) {
      console.error('음성 변환 실패:', error);
    }
  };

  const handlePlay = async () => {
    try {
      setIsPlaying(true);
      setHighlightRange({ start: -1, end: -1 });

      await speakWithSentenceHighlight(
        prayer,
        selectedVoice,
        (start, end) => {
          setHighlightRange({ start, end });
          // 스크롤
          if (start >= 0) {
            const el = document.getElementById(`char-${start}`);
            if (el && prayerBoxRef.current) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      );

      setIsPlaying(false);
      setHighlightRange({ start: -1, end: -1 });
    } catch (error) {
      setIsPlaying(false);
      setHighlightRange({ start: -1, end: -1 });
    }
  };

  const handlePause = () => {
    pauseSpeaking();
    setIsPausedState(true);
  };

  const handleStop = () => {
    stopSpeaking();
    setIsPlaying(false);
    setIsPausedState(false);
    setHighlightRange({ start: -1, end: -1 });
  };

  // 마크다운을 HTML로 변환하는 함수
  const convertToHtml = (text: string) => {
    // ## 로 시작하는 헤더를 변환
    let html = text.replace(/## (.*)\n/g, '<h2 style="color: #1976d2; font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 1rem;">$1</h2>');
    
    // 볼드체 변환 (**텍스트**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
    
    // 이탤릭체 변환 (*텍스트*)
    html = html.replace(/\*(.*?)\*/g, '<em style="color: #666;">$1</em>');
    
    // 인용구 변환 (> 텍스트)
    html = html.replace(/> (.*)\n/g, '<blockquote style="border-left: 4px solid #90caf9; padding-left: 1rem; margin: 1rem 0; background-color: #f5f5f5;"><p style="margin: 0.5rem 0;">$1</p></blockquote>');
    
    // 줄바꿈 처리
    html = html.replace(/\n\n/g, '</p><p style="margin: 1rem 0;">');
    html = html.replace(/\n/g, '<br>');
    
    // 전체 텍스트를 p 태그로 감싸기
    html = `<p style="margin: 1rem 0;">${html}</p>`;
    
    return html;
  };

  const renderPrayerWithHighlight = (text: string) => {
    let globalIdx = 0;
    return (
      <div>
        {text.split('\n').map((paragraph, pIdx, arr) => {
          const chars = paragraph.split('');
          const p = (
            <p key={pIdx} style={{ margin: '0 0 1rem 0', lineHeight: '1.8' }}>
              {chars.map((char, cIdx) => {
                const idx = globalIdx + cIdx;
                const isHighlighted =
                  idx >= highlightRange.start && idx < highlightRange.end;
                return (
                  <span
                    key={idx}
                    id={`char-${idx}`}
                    style={{
                      backgroundColor: isHighlighted ? '#ffe082' : 'transparent',
                      color: isHighlighted ? '#d84315' : 'inherit',
                      transition: 'all 0.2s'
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </p>
          );
          globalIdx += chars.length;
          // 줄바꿈(\n)도 인덱스에 포함
          if (pIdx < arr.length - 1) globalIdx += 1;
          return p;
        })}
      </div>
    );
  };

  return (
    <Box>
      <Box sx={{ mt: 2, mb: 3 }}>
        {isEditing ? (
          <textarea
            value={editedPrayer}
            onChange={(e) => setEditedPrayer(e.target.value)}
            style={{
              width: '100%',
              minHeight: '550px',
              padding: '1rem',
              fontSize: '1rem',
              lineHeight: '1.8',
              fontFamily: '"나눔명조", serif',
            }}
          />
        ) : (
          <Box
            ref={prayerBoxRef}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              backgroundColor: '#fff',
              fontFamily: '"나눔명조", serif',
              fontSize: '1rem',
              color: 'text.primary',
              minHeight: '200px',
              maxHeight: '550px',
              overflowY: 'auto',
              mb: 2,
              '& p': {
                margin: '0 0 1rem 0',
                lineHeight: 1.8,
                '&:last-child': {
                  marginBottom: 0
                }
              }
            }}
          >
            {renderPrayerWithHighlight(prayer)}
          </Box>
        )}
      </Box>

      {audioContent && <AudioPlayer audioContent={audioContent} />}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* 첫 번째 그룹: 수정/출력/Word 저장 버튼 */}
          <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>  {/* gap을 2에서 1로 줄이고, 오른쪽 마진 추가 */}
            <Button
              variant="contained"
              onClick={isEditing ? handleSave : handleEdit}
            >
              {isEditing ? '수정 완료' : '수정하기'}
            </Button>
            <Button variant="outlined" onClick={onPrint}>
              출력하기
            </Button>
            <Button variant="outlined" onClick={onSaveToWord}>
              Word저장
            </Button>
          </Box>

          {/* 두 번째 그룹: 음성 제어 */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="voice-select-label">음성 선택</InputLabel>
              <Select
                labelId="voice-select-label"
                value={selectedVoice}
                label="음성 선택"
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isPlaying && !isPausedState}
              >
                {voices.map((voice) => {
                  let company = '';
                  if (voice.name.toLowerCase().includes('google') || voice.voiceURI.toLowerCase().includes('google')) {
                    company = 'Google';
                  } else if (voice.name.toLowerCase().includes('microsoft') || voice.voiceURI.toLowerCase().includes('microsoft')) {
                    company = 'Microsoft';
                  } else {
                    company = '기타';
                  }
                  return (
                    <MenuItem key={voice.voiceURI} value={voice.voiceURI}>
                      {company}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {(!isPlaying || isPausedState) ? (
              <IconButton 
                onClick={handlePlay} 
                color="primary"
                title={isPausedState ? "계속 재생" : "재생"}
                sx={{ 
                  backgroundColor: '#e3f2fd',
                  '&:hover': { backgroundColor: '#bbdefb' }
                }}
              >
                <PlayArrowIcon />
              </IconButton>
            ) : (
              <IconButton 
                onClick={handlePause} 
                color="primary"
                title="일시정지"
                sx={{ 
                  backgroundColor: '#e3f2fd',
                  '&:hover': { backgroundColor: '#bbdefb' }
                }}
              >
                <PauseIcon />
              </IconButton>
            )}

            <IconButton 
              onClick={handleStop} 
              color="primary"
              title="중지"
              disabled={!isPlaying && !isPausedState}
              sx={{ 
                backgroundColor: '#e3f2fd',
                '&:hover': { backgroundColor: '#bbdefb' },
                '&.Mui-disabled': { 
                  backgroundColor: '#f5f5f5',
                  color: 'rgba(0, 0, 0, 0.26)' 
                }
              }}
            >
              <StopIcon />
            </IconButton>
          </Box>
        </Box>

        <Button 
          variant="contained" 
          color="primary" 
          onClick={onSaveToPrayerList}
        >
          기도문 저장
        </Button>
      </Box>
    </Box>
  );
}