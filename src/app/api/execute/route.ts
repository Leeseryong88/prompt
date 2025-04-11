import { NextResponse } from 'next/server';

// API 키를 환경 변수에서 가져옵니다.
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

export async function POST(request: Request) {
  try {
    // API 키 존재 여부 확인
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: '프롬프트가 필요합니다.' }, 
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || '알 수 없는 오류' }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답 처리 중 오류가 발생했습니다.';

    return NextResponse.json({ result });
  } catch (error) {
    console.error('프롬프트 실행 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' }, 
      { status: 500 }
    );
  }
} 