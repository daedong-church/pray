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

  useEffect(() => {
    setEditedPrayer(prayer);
  }, [prayer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpeechSynthesis(window.speechSynthesis);
    }
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
    if (!speechSynthesis) return;

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

        switch (selectedTTS) {
          case 'web':
            // Web Speech API
            const utterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
            utterance.lang = 'ko-KR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.onend = () => {
              currentIndex++;
              setCurrentHighlight(currentIndex);
              speakNextSentence();
            };
            setCurrentHighlight(currentIndex);
            speechSynthesis.speak(utterance);
            break;

          case 'microsoft':
            // Microsoft Edge TTS
            const msUtterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
            msUtterance.lang = 'ko-KR';
            msUtterance.voice = speechSynthesis.getVoices().find(voice => 
              voice.name.includes('Microsoft') && voice.lang.includes('ko')
            ) || null;
            msUtterance.onend = () => {
              currentIndex++;
              setCurrentHighlight(currentIndex);
              speakNextSentence();
            };
            setCurrentHighlight(currentIndex);
            speechSynthesis.speak(msUtterance);
            break;

          case 'google':
            // Google TTS
            const googleTTS = new SpeechSynthesisUtterance(sentences[currentIndex]);
            googleTTS.lang = 'ko-KR';
            // Google 음성 선택
            const voices = speechSynthesis.getVoices();
            const googleVoice = voices.find(voice => 
              voice.name.includes('Google') && voice.lang.includes('ko')
            ) || voices.find(voice => 
              voice.name.includes('Google')
            ) || null;
            
            if (googleVoice) {
              googleTTS.voice = googleVoice;
            }
            
            googleTTS.onend = () => {
              currentIndex++;
              setCurrentHighlight(currentIndex);
              speakNextSentence();
            };
            setCurrentHighlight(currentIndex);
            speechSynthesis.speak(googleTTS);
            break;
        }
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
          height: '500px',
          transition: 'height 0.3s ease-in-out',
          overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              backgroundColor: '#fff',
              fontFamily: '"나눔명조", serif',
              fontSize: '1rem',
              lineHeight: 1.8,
              color: 'text.primary',
              '& h2': {
                color: 'primary.main',
                fontSize: '1.2rem',
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
                px: 2,
                py: 1,
                my: 2,
              },
              '& p': {
            my: 1.5
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            variant="contained"
            size="small"
            onClick={isEditing ? handleSave : handleEdit}
            sx={{ minWidth: '80px' }}
          >
            {isEditing ? '수정완료' : '수정하기'}
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={onPrint}
            sx={{ minWidth: '80px' }}
          >
            출력하기
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={onSaveToWord}
            sx={{ minWidth: '80px' }}
          >
            Word저장
          </Button>
          <Box sx={{ ml: 3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
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
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          sx={{ minWidth: '100px' }}
        >
          기도문 저장
        </Button>
      </Box>
    </Box>
  );
} 
