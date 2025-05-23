'use client';

import { useState, useEffect } from 'react';
import { Container, Box, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, Radio, RadioGroup, FormLabel, Slider, Alert, Paper } from '@mui/material';
import PrayerResult from '@/components/PrayerResult';
import { generatePrayer } from '@/utils/api';
import { textToSpeech, playAudio } from '@/utils/tts';
import { saveToWord } from '@/utils/word';
import { saveSettings, loadSettings, savePrayer, loadPrayers, deletePrayer } from '@/utils/storage';
import { printPrayer } from '@/utils/print';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Prayer } from '../types/prayer';

// 파일 상단에 버전 상수 추가
const VERSION = '1.0.3';

// SavedPrayer 타입 정의 추가
interface SavedPrayer {
  id: string;
  date: string;
  serviceType: string;
  style: string;
  audience: string;
  length: number;
  content: string;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4.1');
  const [serviceType, setServiceType] = useState('sunday');
  const [style, setStyle] = useState('traditional');
  const [audience, setAudience] = useState('believer');
  const [usePrayerStructure, setUsePrayerStructure] = useState(true);
  const [specialNotes, setSpecialNotes] = useState('');
  const [length, setLength] = useState(4);
  const [prayer, setPrayer] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [prayerGenerationError, setPrayerGenerationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // savedPrayers 상태 변수 추가
  const [savedPrayers, setSavedPrayers] = useState<SavedPrayer[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrayer, setEditedPrayer] = useState('');

  // 대화상자 상태 추가
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmAction: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmAction: () => {}
  });

  // 컴포넌트 마운트 시 설정과 저장된 기도문들을 불러옴
  useEffect(() => {
    // 설정 불러오기
    const settings = loadSettings();
    if (settings) {
      if (settings.apiKey) {
        setApiKey(settings.apiKey);
      }
      if (settings.model) {
        setModel(settings.model);
      }
    }

    // 저장된 기도문들 불러오기
    const prayers = loadPrayers();
    if (prayers && prayers.length > 0) {
      setSavedPrayers(prayers);
    }
  }, []);

  // API Key나 모델 변경 시 설정 저장
  useEffect(() => {
    if (apiKey || model) {  // 값이 있을 때만 저장
      saveSettings({ apiKey, model });
    }
  }, [apiKey, model]);

  // API Key 저장 핸들러 수정
  const handleSaveSettings = () => {
    if (apiKey) {
      setDialog({
        open: true,
        title: 'API Key 저장',
        message: 'API Key를 저장하시겠습니까?',
        confirmAction: () => {
          saveSettings({ apiKey, model });
          setSuccessMessage('API Key가 저장되었습니다.');
          setTimeout(() => setSuccessMessage(''), 3000);
          setDialog(prev => ({ ...prev, open: false }));
        }
      });
    }
  };

  // 기도문 생성 핸들러 수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialog({
      open: true,
      title: '기도문 생성',
      message: '입력하신 내용으로 기도문을 생성하시겠습니까?',
      confirmAction: async () => {
        setDialog(prev => ({ ...prev, open: false }));
        setPrayerGenerationError('');
        setLoading(true);

        try {
          const generatedPrayer = await generatePrayer(apiKey, {
            serviceType,
            usePrayerStructure,
            style,
            audience,
            specialNotes,
            length,
            model,
          });
          setPrayer(generatedPrayer);
          setSuccessMessage('기도문이 생성되었습니다.');
          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
          setPrayerGenerationError(err instanceof Error ? err.message : '기도문 생성 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleEdit = () => {
    // 수정 모드 진입만 처리
  };

  const handleSave = (editedContent: string) => {
    // 수정된 내용을 prayer 상태에 반영
    setPrayer(editedContent);
  };

  const handlePrint = () => {
    printPrayer({
      prayer,
      serviceType,
      style,
      audience,
      length
    });
  };

  const handleTTS = async () => {
    try {
      const audioContent = await textToSpeech(prayer);
      playAudio(audioContent);
    } catch (err) {
      setPrayerGenerationError(err instanceof Error ? err.message : '음성 변환 중 오류가 발생했습니다.');
    }
  };

  // 기도문 저장 핸들러 수정
  const handleSaveToPrayerList = () => {
    const newPrayer = {
      id: new Date().getTime().toString(),
      date: new Date().toISOString(),
      serviceType,
      style,
      audience,
      length,
      content: prayer
    };

    // 동일한 파일명이 있는지 확인
    const existingPrayer = savedPrayers.find(p => 
      new Date(p.date).toLocaleDateString() === new Date(newPrayer.date).toLocaleDateString() &&
      p.serviceType === newPrayer.serviceType &&
      p.style === newPrayer.style &&
      p.audience === newPrayer.audience &&
      p.length === newPrayer.length
    );

    if (existingPrayer) {
      // 동일한 파일명이 있는 경우
      setDialog({
        open: true,
        title: '기도문 수정',
        message: '동일한 파일명의 기도문이 있습니다. 기존 기도문을 수정하시겠습니까?',
        confirmAction: () => {
          // 기존 ID를 유지하면서 내용 업데이트
          const updatedPrayer = {
            ...newPrayer,
            id: existingPrayer.id
          };

          // 저장소 업데이트
          savePrayer(updatedPrayer);
          
          // 상태 업데이트
          setSavedPrayers(prev => prev.map(p => 
            p.id === existingPrayer.id ? updatedPrayer : p
          ));

          setSuccessMessage('기도문이 수정되었습니다.');
          setTimeout(() => setSuccessMessage(''), 3000);
          setDialog(prev => ({ ...prev, open: false }));
        }
      });
    } else {
      // 새로운 파일명인 경우
      setDialog({
        open: true,
        title: '기도문 저장',
        message: '현재 기도문을 저장하시겠습니까?',
        confirmAction: () => {
          // 새 기도문 저장
          savePrayer(newPrayer);
          
          // 상태 업데이트 (최신 항목이 위로 오도록)
          setSavedPrayers(prev => [newPrayer, ...prev]);

          setSuccessMessage('기도문이 저장되었습니다.');
          setTimeout(() => setSuccessMessage(''), 3000);
          setDialog(prev => ({ ...prev, open: false }));
        }
      });
    }
  };

  const handleSaveToWord = async () => {
    try {
      const saved = await saveToWord({
        prayer,
        serviceType,
        style,
        audience,
        length
      });
      
      if (saved) {
        setSuccessMessage('Word 파일이 저장되었습니다.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      setPrayerGenerationError('Word 파일 저장 중 오류가 발생했습니다.');
      setTimeout(() => setPrayerGenerationError(''), 3000);
    }
  };
  // 기도문 삭제 핸들러 수정
  const handleDelete = (id: string) => {
    setDialog({
      open: true,
      title: '기도문 삭제',
      message: '선택한 기도문을 삭제하시겠습니까?',
      confirmAction: () => {
        deletePrayer(id);
        setSavedPrayers(prev => prev.filter(p => p.id !== id));
        setSuccessMessage('기도문이 삭제되었습니다.');
        setTimeout(() => setSuccessMessage(''), 3000);
        setDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  // prayer 문자열을 Prayer 객체로 변환
  const prayerObject: Prayer = {
    id: '1', // 적절한 ID 값 설정
    content: prayer, // 기존 prayer 문자열을 content로 사용
    createdAt: new Date().toISOString(), // 현재 시간으로 설정
    updatedAt: new Date().toISOString() // 현재 시간으로 설정
  };

  return (
    <Container maxWidth="md">
      {/* 버전 표시 추가 */}
      <Box sx={{ 
        textAlign: 'right',
        mb: 1,
        color: 'text.secondary',
        fontSize: '0.8rem'
      }}>
        ver {VERSION}
      </Box>

      {/* 홈 화면 영역 */}
      <Paper elevation={3} sx={{ my: { xs: 2, sm: 3, md: 4 }, p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ 
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
        }}>
          기도문 작성
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 2 }, 
          alignItems: { xs: 'stretch', sm: 'center' } 
        }}>
          <TextField
            sx={{ 
              flex: 1,
              '& .MuiInputBase-root': {
                height: { xs: 36, sm: 40 }
              }
            }}
            label="API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            margin="normal"
            required
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSettings}
            sx={{ 
              height: { xs: 36, sm: 40 },
              mt: { xs: 0, sm: '8px' }
            }}
          >
            저장
          </Button>
          <FormControl 
            sx={{ 
              minWidth: { xs: '100%', sm: 200 },
              '& .MuiInputBase-root': {
                height: { xs: 36, sm: 40 }
              }
            }} 
            margin="normal"
            size="small"
          >
            <InputLabel>API 모델</InputLabel>
            <Select
              value={model}
              label="API 모델"
              onChange={(e) => setModel(e.target.value)}
              required
            >
              <MenuItem value="gpt-4.1">GPT-4.1</MenuItem>
              <MenuItem value="gpt-4.1-mini">GPT-4.1-mini</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* API Key 저장 성공 메시지 */}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMessage}
          </Alert>
        )}
      </Paper>

      {/* 기도문 작성 화면 */}
      <Paper elevation={3} sx={{ my: 4, p: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          기도문 생성
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit}>
          {/* 기도문 생성 에러 메시지 */}
          {prayerGenerationError && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {prayerGenerationError}
            </Alert>
          )}

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 2 }, 
            mb: 2, 
            alignItems: { xs: 'stretch', sm: 'center' } 
          }}>
            {/* 예배 종류 */}
            <FormControl 
              sx={{ 
                flex: 1,
                '& .MuiInputBase-root': {
                  height: { xs: 36, sm: 40 }
                }
              }}
              size="small"
            >
              <InputLabel>예배 종류</InputLabel>
              <Select
                value={serviceType}
                label="예배 종류"
                onChange={(e) => setServiceType(e.target.value)}
                required
              >
                <MenuItem value="sunday">주일예배</MenuItem>
                <MenuItem value="dawn">새벽예배</MenuItem>
                <MenuItem value="afternoon">오후예배</MenuItem>
                <MenuItem value="wednesday">수요예배</MenuItem>
                <MenuItem value="friday">금요기도회</MenuItem>
                <MenuItem value="christmas">성탄절</MenuItem>
                <MenuItem value="easter">부활절</MenuItem>
                <MenuItem value="thanksgiving">추수감사절</MenuItem>
              </Select>
            </FormControl>

            {/* 스타일 */}
            <FormControl 
              sx={{ 
                flex: 1,
                '& .MuiInputBase-root': {
                  height: { xs: 36, sm: 40 }
                }
              }}
              size="small"
            >
              <InputLabel>스타일</InputLabel>
              <Select
                value={style}
                label="스타일"
                onChange={(e) => setStyle(e.target.value)}
                required
              >
                <MenuItem value="traditional">전통적</MenuItem>
                <MenuItem value="modern">현대적</MenuItem>
                <MenuItem value="literary">문학적</MenuItem>
                <MenuItem value="emotional">감성적</MenuItem>
                <MenuItem value="creative">창조적</MenuItem>
              </Select>
            </FormControl>

            {/* 대상자 */}
            <FormControl 
              sx={{ 
                flex: 1,
                '& .MuiInputBase-root': {
                  height: { xs: 36, sm: 40 }
                }
              }}
              size="small"
            >
              <InputLabel>대상자</InputLabel>
              <Select
                value={audience}
                label="대상자"
                onChange={(e) => setAudience(e.target.value)}
                required
              >
                <MenuItem value="believer">성도</MenuItem>
                <MenuItem value="children">어린이</MenuItem>
                <MenuItem value="youth">청소년</MenuItem>
                <MenuItem value="youngAdult">청년</MenuItem>
                <MenuItem value="adult">장년</MenuItem>
                <MenuItem value="patient">환자</MenuItem>
                <MenuItem value="funeral">장례</MenuItem>
                <MenuItem value="wedding">결혼</MenuItem>
                <MenuItem value="business">개업</MenuItem>
                <MenuItem value="hospital">병원</MenuItem>
              </Select>
            </FormControl>

            {/* 기도 순서 구조 */}
            <FormControl sx={{ width: 90 }}>
              <Typography variant="caption" gutterBottom>
                기도 순서 구조
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Switch
                  checked={usePrayerStructure}
                  onChange={(e) => setUsePrayerStructure(e.target.checked)}
                  size="small"
                />
              </Box>
            </FormControl>

            {/* 기도문 길이 */}
            <FormControl sx={{ width: 90 }}>
              <Typography variant="caption" gutterBottom>
                기도문 길이(분)
              </Typography>
              <Slider
                value={length}
                onChange={(_, value) => setLength(value as number)}
                min={1}
                max={7}
                step={1}
                marks
                valueLabelDisplay="auto"
                size="small"
              />
            </FormControl>

            {/* 생성 버튼 */}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="medium"
              sx={{ 
                height: { xs: 36, sm: 40 },
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              {loading ? '생성 중...' : '기도문 생성'}
            </Button>
          </Box>

          {/* 특이사항 */}
          <TextField
            fullWidth
            label="특이 사항"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
        </Box>
      </Paper>

      {/* 기도문 결과 화면 */}
      {prayer && (
        <Paper elevation={3} sx={{ my: 4, p: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            기도문 출력/수정
          </Typography>
          <PrayerResult
            prayer={prayerObject}
            onEdit={handleEdit}
            onSave={handleSave}
            onPrint={handlePrint}
            onSaveToWord={handleSaveToWord}
            onTTS={handleTTS}
            onSaveToPrayerList={handleSaveToPrayerList}
          />
        </Paper>
      )}

      {/* 저장된 기도문 목록 */}
      {savedPrayers.length > 0 && (
        <Paper elevation={3} sx={{ my: 4, p: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            저장된 기도문 관리
          </Typography>
          <Box>
            {/* 날짜 기준으로 내림차순 정렬하여 최신 항목이 위로 오도록 함 */}
            {savedPrayers
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((savedPrayer) => (
                <Paper 
                  key={savedPrayer.id} 
                  elevation={1} 
                  sx={{ 
                    p: 0.1,  // 패딩 축소
                    mb: 0.1,   // 아래 마진 축소
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Typography 
                      variant="subtitle2"
                      onClick={() => {
                        setPrayer(savedPrayer.content);
                        setServiceType(savedPrayer.serviceType);
                        setStyle(savedPrayer.style);
                        setAudience(savedPrayer.audience);
                        setLength(savedPrayer.length);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.main',
                          textDecoration: 'underline'
                        },
                        flex: 1,
                        mr: 2
                      }}
                    >
                      {new Date(savedPrayer.date).toLocaleDateString()} | {
                        {
                          'sunday': '주일예배',
                          'dawn': '새벽예배',
                          'afternoon': '오후예배',
                          'wednesday': '수요예배',
                          'friday': '금요기도회',
                          'christmas': '성탄절',
                          'easter': '부활절',
                          'thanksgiving': '추수감사절'
                        }[savedPrayer.serviceType]
                      } | {
                        {
                          'traditional': '전통적',
                          'modern': '현대적',
                          'literary': '문학적',
                          'emotional': '감성적',
                          'creative': '창조적' 
                        }[savedPrayer.style]
                      } | {
                        {
                          'believer': '성도',
                          'children': '어린이',
                          'youth': '청소년',
                          'youngAdult': '청년',
                          'patient': '환자',
                          'funeral': '장례',
                          'wedding': '결혼',
                          'business': '개업',
                          'hospital': '병원'
                        }[savedPrayer.audience]
                      } | {savedPrayer.length}분
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(savedPrayer.id)}
                    >
                      삭제
                    </Button>
                  </Box>
                </Paper>
              ))}
          </Box>
        </Paper>
      )}

      {/* 확인 대화상자 추가 */}
      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.confirmAction}
        onCancel={() => setDialog(prev => ({ ...prev, open: false }))}
      />
    </Container>
  );
}