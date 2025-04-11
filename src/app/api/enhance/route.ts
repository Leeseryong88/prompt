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

    // Gemini 2.0 Flash에서는 system role이 지원되지 않으므로 
    // 사용자 프롬프트에 시스템 지시사항을 포함시킵니다
    const systemPrompt = `너는 사용자의 원래 프롬프트를 분석하여, 명확성, 맥락성, 형식, 역할 부여 등을 보완해 더 효과적인 프롬프트로 개선하는 역할을 맡고 있어.

아래의 사용자의 프롬프트를 검토하고 목적에 맞게 개선해줘. 응답은 반드시 다음과 같은 형식으로 작성해주세요:

1. 먼저 개선된 프롬프트만 깔끔하게 작성해주세요.
2. 그 다음 "개선 이유:" 라는 제목을 작성한 후 아래에 개선한 이유, 변경 사항, 톤, 스타일, 형식 등에 대한 설명을 작성해주세요.

예시:
[개선된 프롬프트 내용]

개선 이유:
[개선 이유에 대한 설명]`;

    const enhancementPrompt = `${systemPrompt}\n\n원본 프롬프트: ${prompt}`;

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
                text: enhancementPrompt
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
    const enhancedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답 처리 중 오류가 발생했습니다.';

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    console.error('프롬프트 개선 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' }, 
      { status: 500 }
    );
  }
} 