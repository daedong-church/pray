export interface Settings {
  apiKey: string;
  model: string;
}

export interface SavedPrayer {
  id: string;
  date: string;
  serviceType: string;
  style: string;
  audience: string;
  length: number;
  content: string;
}

export function saveSettings(settings: Settings): void {
  try {
    if (typeof window !== 'undefined') {  // 서버 사이드 렌더링 대비
      const settingsString = JSON.stringify(settings);
      localStorage.setItem('prayerSettings', settingsString);  // sessionStorage -> localStorage
    }
  } catch (error) {
    console.error('설정 저장 중 오류 발생:', error);
  }
}

export function loadSettings(): Settings {
  try {
    if (typeof window !== 'undefined') {  // 서버 사이드 렌더링 대비
      const savedSettings = localStorage.getItem('prayerSettings');  // sessionStorage -> localStorage
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    }
  } catch (error) {
    console.error('설정 불러오기 중 오류 발생:', error);
  }
  return { apiKey: '', model: 'gpt-4.1' };
}

export function savePrayer(prayer: SavedPrayer): void {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('savedPrayers');
    const prayers: SavedPrayer[] = saved ? JSON.parse(saved) : [];
    
    // 같은 날짜, 예배종류, 스타일, 대상자, 길이를 가진 기도문이 있는지 확인
    const existingPrayerIndex = prayers.findIndex(p => 
      new Date(p.date).toLocaleDateString() === new Date(prayer.date).toLocaleDateString() &&
      p.serviceType === prayer.serviceType &&
      p.style === prayer.style &&
      p.audience === prayer.audience &&
      p.length === prayer.length
    );

    if (existingPrayerIndex !== -1) {
      // 기존 기도문이 있으면 내용만 업데이트
      prayers[existingPrayerIndex].content = prayer.content;
    } else {
      // 새로운 기도문이면 추가
      prayers.push(prayer);
    }

    localStorage.setItem('savedPrayers', JSON.stringify(prayers));
  }
}

export function loadPrayers(): SavedPrayer[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('savedPrayers');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
}

export function deletePrayer(id: string): void {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('savedPrayers');
    if (saved) {
      const prayers: SavedPrayer[] = JSON.parse(saved);
      const filtered = prayers.filter(prayer => prayer.id !== id);
      localStorage.setItem('savedPrayers', JSON.stringify(filtered));
    }
  }
}
