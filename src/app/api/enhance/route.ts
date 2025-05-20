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
    const systemPrompt = `# 프롬프트 개선 지침

## 1. 형식 요구사항
응답은 다음 마커들을 사용하여 정확히 구조화해야 합니다:
- "---PROMPT_START---": 개선된 프롬프트의 시작을 표시
- "---PROMPT_END---": 개선된 프롬프트의 끝을 표시
- "---REASON_START---": 개선 이유 설명의 시작을 표시
- "---REASON_END---": 개선 이유 설명의 끝을 표시

## 2. 개선된 프롬프트 작성 방법
- 명확한 역할 부여 (예: **[역할]** 섹션 사용)
- 구체적인 작업 설명 (예: **[목표]** 또는 **[작업]** 섹션 사용)
- 필요한 배경 정보와 맥락 추가
- 포맷팅과 구조를 개선하여 가독성 향상
- 애매한 지시사항 명확화

## 3. 이유 설명 방법
- 무엇을 개선했는지 구체적으로 설명
- 개선이 왜 효과적인지 논리적으로 서술
- 원래 프롬프트와 비교하여 변경점 강조

## 4. 예시 구조
---PROMPT_START---
**[역할]**
당신은 [특정 역할]을 맡은 전문가입니다.

**[목표]**
다음 내용을 [특정 방식]으로 수행하시오.
---PROMPT_END---

---REASON_START---
이 프롬프트를 개선한 이유는 다음과 같습니다:
1. 명확한 역할 부여를 통해...
2. 구체적인 작업 지시를 통해...
---REASON_END---

## 5. 중요 요구사항
- 모든 마커를 반드시 포함할 것
- 개선된 프롬프트 내용이 잘리지 않도록 주의할 것
- 원본 프롬프트의 의도와 핵심 내용은 유지할 것

## 작업 요청
위 지침에 따라 아래 프롬프트를 분석하고 개선해주세요.`;

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
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답 처리 중 오류가 발생했습니다.';
    
    console.log('API 응답 원본:', responseText.substring(0, 200) + '...');
    
    // 마커를 이용해 파싱
    const promptStartMarker = '---PROMPT_START---';
    const promptEndMarker = '---PROMPT_END---';
    const reasonStartMarker = '---REASON_START---';
    const reasonEndMarker = '---REASON_END---';
    
    let enhancedPrompt = '';
    let enhancedReason = '';
    
    // 마커를 사용한 파싱 시도
    const promptStartIndex = responseText.indexOf(promptStartMarker);
    
    // 시작 마커가 있는 경우
    if (promptStartIndex !== -1) {
      const startContentIndex = promptStartIndex + promptStartMarker.length;
      let endContentIndex;
      
      // 종료 마커가 있는 경우
      const promptEndIndex = responseText.indexOf(promptEndMarker);
      if (promptEndIndex !== -1) {
        endContentIndex = promptEndIndex;
      } else {
        // 이유 시작 마커가 있는 경우
        const reasonStartIndex = responseText.indexOf(reasonStartMarker);
        if (reasonStartIndex !== -1) {
          endContentIndex = reasonStartIndex;
        } else {
          // 모든 마커가 없는 경우 텍스트 끝까지 사용
          endContentIndex = responseText.length;
        }
      }
      
      enhancedPrompt = responseText.substring(startContentIndex, endContentIndex).trim();
      
      // 이유 부분 파싱
      const reasonStartIndex = responseText.indexOf(reasonStartMarker);
      if (reasonStartIndex !== -1) {
        const reasonStartContentIndex = reasonStartIndex + reasonStartMarker.length;
        let reasonEndContentIndex;
        
        // 이유 종료 마커가 있는 경우
        const reasonEndIndex = responseText.indexOf(reasonEndMarker);
        if (reasonEndIndex !== -1) {
          reasonEndContentIndex = reasonEndIndex;
        } else {
          // 종료 마커가 없는 경우 텍스트 끝까지 사용
          reasonEndContentIndex = responseText.length;
        }
        
        enhancedReason = responseText.substring(reasonStartContentIndex, reasonEndContentIndex).trim();
      }
    } else {
      // 마커가 없는 경우 전체 텍스트를 반환
      return NextResponse.json({ enhancedPrompt: responseText });
    }
    
    if (!enhancedPrompt) {
      // 프롬프트 파싱에 실패한 경우 전체 텍스트를 반환
      return NextResponse.json({ enhancedPrompt: responseText });
    }
    
    // 두 부분 조합
    const formattedResponse = enhancedReason 
      ? `${enhancedPrompt}\n\n개선 이유:\n${enhancedReason}`
      : enhancedPrompt;
    
    console.log('파싱된 결과:', formattedResponse.substring(0, 200) + '...');
    
    return NextResponse.json({ enhancedPrompt: formattedResponse });
  } catch (error) {
    console.error('프롬프트 개선 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' }, 
      { status: 500 }
    );
  }
} 