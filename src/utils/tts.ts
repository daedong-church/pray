export async function textToSpeech(text: string): Promise<string> {
  try {
    const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_CLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-D' },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });

    if (!response.ok) {
      throw new Error('음성 변환에 실패했습니다.');
    }

    const data = await response.json();
    return data.audioContent;
  } catch (error) {
    console.error('Error in text to speech:', error);
    throw new Error('음성 변환 중 오류가 발생했습니다.');
  }
}

export function playAudio(audioContent: string) {
  const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
  audio.play();
} 