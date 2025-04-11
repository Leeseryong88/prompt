import { NextResponse } from 'next/server';

// API 키를 환경 변수에서 가져옵니다.
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

// ASCII 테이블 형식을 마크다운 테이블로 변환하는 함수
function convertAsciiTableToMarkdown(text: string): string {
  // 여러 줄의 텍스트를 줄 단위로 분리
  const lines = text.split('\n');
  const processedLines = [];
  let inTable = false;
  let tableStartIndex = -1;

  // 테이블 형식 패턴 (예: | ---- | ---- | 또는 +-----+-----+)
  const tablePatterns = [
    /^\s*[\|\+][\-\+]+[\|\+]/,  // | ---- | 또는 +----+ 형태
    /^\s*[\|\+][\s\-\=\+]+[\|\+]/,  // | --- | 또는 + --- + 형태
    /^\s*[\-\+]{3,}/  // ------- 또는 ++++++ 형태
  ];

  // 구분선 위에 헤더가 있는지 확인하는 함수
  const hasHeaderAbove = (index: number) => {
    if (index <= 0) return false;
    
    // 이전 줄이 | text | text | 형태인지 확인
    return /^\s*[\|\+].+[\|\+]\s*$/.test(lines[index - 1]);
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 잠재적 테이블 구분선 검출
    const isTableSeparator = tablePatterns.some(pattern => pattern.test(line));
    
    if (isTableSeparator && hasHeaderAbove(i)) {
      // 테이블의 시작 감지
      if (!inTable) {
        inTable = true;
        tableStartIndex = i - 1; // 헤더 줄 인덱스
        
        // 헤더 줄 포맷팅 (마크다운 테이블 헤더로 변환)
        let headerLine = lines[tableStartIndex];
        headerLine = headerLine.replace(/^\s*[\|\+]\s*|\s*[\|\+]\s*$/g, '|').trim();
        // 내부 구분자 포맷팅
        headerLine = headerLine.replace(/\s*[\|\+]\s*/g, ' | ');
        if (!headerLine.startsWith('|')) headerLine = '| ' + headerLine;
        if (!headerLine.endsWith('|')) headerLine = headerLine + ' |';
        
        // 처리된 헤더를 추가 (테이블 시작)
        processedLines[tableStartIndex] = headerLine;
        
        // 구분선 포맷팅 (마크다운 테이블 구분선으로 변환)
        const headerCells = headerLine.split('|').filter(cell => cell.trim()).length;
        let separatorLine = '|';
        for (let j = 0; j < headerCells; j++) {
          separatorLine += ' --- |';
        }
        
        processedLines.push(separatorLine);
        continue;
      }
    } 
    else if (inTable) {
      // 테이블 내부의 행 처리
      if (/^\s*[\|\+].+[\|\+]\s*$/.test(line)) {
        // 테이블 행 포맷팅 (마크다운 테이블 행으로 변환)
        line = line.replace(/^\s*[\|\+]\s*|\s*[\|\+]\s*$/g, '|').trim();
        line = line.replace(/\s*[\|\+]\s*/g, ' | ');
        if (!line.startsWith('|')) line = '| ' + line;
        if (!line.endsWith('|')) line = line + ' |';
        processedLines.push(line);
      } else {
        // 테이블 종료 감지
        inTable = false;
        processedLines.push(line);
      }
    } else {
      // 테이블 외부 텍스트는 그대로 유지
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}

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
    let result = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답 처리 중 오류가 발생했습니다.';
    
    // ASCII 테이블을 마크다운 테이블로 변환
    result = convertAsciiTableToMarkdown(result);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('프롬프트 실행 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' }, 
      { status: 500 }
    );
  }
} 