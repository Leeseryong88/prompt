import { NextResponse } from 'next/server';

// API 키를 환경 변수에서 가져옵니다.
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

// ASCII 테이블을 HTML 테이블로 직접 변환하는 함수
function convertToHtmlTable(text: string): string {
  // 여러 줄의 텍스트를 줄 단위로 분리
  const lines = text.split('\n');
  const processedLines = [];
  let inTable = false;
  let currentTableLines: string[] = [];
  let tableDetected = false;

  // 마크다운 테이블 패턴 (| --- | --- |)
  const markdownTablePattern = /^\s*\|.*\|\s*$/;
  const markdownSeparatorPattern = /^\s*\|[\s\-:\|]+\|\s*$/;

  // ASCII 테이블 패턴 (+---------+------+)
  const asciiTablePatterns = [
    /^\s*[\|\+][\-\+=]+[\|\+]/, // | ---- | 또는 +----+ 형태
    /^\s*[\-\+]{3,}/ // ------- 또는 ++++++
  ];

  // 마크다운 특수문자 처리 함수
  const processMarkdownInCell = (content: string): string => {
    // 볼드 처리 (**text** 또는 __text__)
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // 이탤릭 처리 (*text* 또는 _text_)
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    content = content.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // 줄바꿈을 <br> 태그로 변환
    content = content.replace(/\\n/g, '<br>');
    
    // 공백 보존 (연속된 공백을 &nbsp;로 변환)
    content = content.replace(/ {2,}/g, (match) => {
      return ' ' + '&nbsp;'.repeat(match.length - 1);
    });
    
    return content;
  };

  // 마크다운 테이블 변환 함수
  const processMarkdownTable = (tableLines: string[]): string => {
    if (tableLines.length < 2) return tableLines.join('\n'); // 최소 헤더와 구분자 필요

    let html = '<div class="table-responsive"><table class="table table-bordered">\n<thead>\n<tr>\n';
    
    // 헤더 행 처리
    const headerCells = tableLines[0].split('|')
      .filter((cell, i, arr) => i > 0 && i < arr.length - 1 || (i === 0 && cell.trim()) || (i === arr.length - 1 && cell.trim()))
      .map(cell => cell.trim());
    
    headerCells.forEach(cell => {
      const processedCell = processMarkdownInCell(cell);
      html += `<th>${processedCell}</th>\n`;
    });
    
    html += '</tr>\n</thead>\n<tbody>\n';
    
    // 데이터 행 처리 (구분자 행 건너뛰기)
    for (let i = 2; i < tableLines.length; i++) {
      if (markdownSeparatorPattern.test(tableLines[i])) continue; // 다른 구분자 행 건너뛰기
      
      html += '<tr>\n';
      
      const cells = tableLines[i].split('|')
        .filter((cell, i, arr) => i > 0 && i < arr.length - 1 || (i === 0 && cell.trim()) || (i === arr.length - 1 && cell.trim()))
        .map(cell => cell.trim());
      
      cells.forEach(cell => {
        const processedCell = processMarkdownInCell(cell);
        html += `<td>${processedCell}</td>\n`;
      });
      
      html += '</tr>\n';
    }
    
    html += '</tbody>\n</table></div>';
    return html;
  };

  // ASCII 표를 HTML 테이블로 변환하는 함수
  const processAsciiTable = (tableLines: string[]): string => {
    // 열 경계 위치 찾기
    const findColumnBoundaries = (headerLine: string): number[] => {
      const boundaries = [];
      let inCell = false;
      
      for (let i = 0; i < headerLine.length; i++) {
        if ((headerLine[i] === '|' || headerLine[i] === '+') && !inCell) {
          boundaries.push(i);
          inCell = true;
        } else if ((headerLine[i] !== '|' && headerLine[i] !== '+') && inCell) {
          inCell = false;
        }
      }
      
      // 마지막 열 경계 추가
      if (headerLine.endsWith('|') || headerLine.endsWith('+')) {
        boundaries.push(headerLine.length - 1);
      }
      
      return boundaries;
    };
    
    // 헤더 행 찾기 (첫 번째 구분자 위의 행)
    let headerLineIndex = -1;
    for (let i = 0; i < tableLines.length; i++) {
      if (asciiTablePatterns.some(pattern => pattern.test(tableLines[i]))) {
        headerLineIndex = i - 1;
        break;
      }
    }
    
    if (headerLineIndex < 0) return tableLines.join('\n'); // 유효한 테이블 아님
    
    const headerLine = tableLines[headerLineIndex];
    const boundaries = findColumnBoundaries(headerLine);
    
    if (boundaries.length < 2) return tableLines.join('\n'); // 유효한 열 경계가 없음
    
    // HTML 테이블 생성 시작
    let html = '<div class="table-responsive"><table class="table table-bordered">\n<thead>\n<tr>\n';
    
    // 헤더 셀 추출
    const headerCells = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i] + 1;
      const end = boundaries[i + 1];
      const cell = headerLine.substring(start, end).trim();
      headerCells.push(cell);
      const processedCell = processMarkdownInCell(cell);
      html += `<th>${processedCell}</th>\n`;
    }
    
    html += '</tr>\n</thead>\n<tbody>\n';
    
    // 데이터 행 처리
    let inDataSection = false;
    for (let i = headerLineIndex + 2; i < tableLines.length; i++) {
      // 구분자 행이나 빈 행 건너뛰기
      if (asciiTablePatterns.some(pattern => pattern.test(tableLines[i])) || !tableLines[i].trim()) {
        if (inDataSection) break; // 다른 구분자를 만나면 테이블 종료
        continue;
      }
      
      inDataSection = true;
      const rowLine = tableLines[i];
      html += '<tr>\n';
      
      // 동일한 열 경계를 사용하여 셀 추출
      for (let j = 0; j < boundaries.length - 1; j++) {
        const start = boundaries[j] + 1;
        const end = boundaries[j + 1];
        let cell = '';
        
        if (start < rowLine.length) {
          cell = (end < rowLine.length ? rowLine.substring(start, end) : rowLine.substring(start)).trim();
        }
        
        const processedCell = processMarkdownInCell(cell);
        html += `<td>${processedCell}</td>\n`;
      }
      
      html += '</tr>\n';
    }
    
    html += '</tbody>\n</table></div>';
    return html;
  };

  // 각 줄 처리
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 마크다운 테이블 감지
    if (markdownTablePattern.test(line)) {
      if (!inTable) {
        // 새로운 테이블 시작
        inTable = true;
        currentTableLines = [line];
        
        // 다음 줄이 구분자인지 확인
        if (i + 1 < lines.length && markdownSeparatorPattern.test(lines[i + 1])) {
          tableDetected = true;
        }
      } else {
        // 기존 테이블에 행 추가
        currentTableLines.push(line);
      }
    }
    // ASCII 테이블 구분자 감지
    else if (asciiTablePatterns.some(pattern => pattern.test(line))) {
      if (!inTable) {
        // 새로운 ASCII 테이블 시작 (이전 줄부터 포함)
        inTable = true;
        // 한 줄 위가 헤더인 경우만 테이블로 취급
        if (i > 0 && /^\s*[\|\+].+[\|\+]\s*$/.test(lines[i - 1])) {
          currentTableLines = [lines[i - 1], line];
          tableDetected = true;
          // 이전 줄을 제거 (이미 테이블에 포함됨)
          if (processedLines.length > 0) {
            processedLines.pop();
          }
        } else {
          // 헤더가 없는 경우 일반 텍스트로 처리
          processedLines.push(line);
          inTable = false;
        }
      } else {
        // 기존 테이블에 구분자 추가
        currentTableLines.push(line);
      }
    }
    else if (inTable) {
      // 테이블 외부 행 감지 (빈 줄이거나 테이블 형식이 아닌 경우)
      if (!line.trim() || (!markdownTablePattern.test(line) && !asciiTablePatterns.some(pattern => pattern.test(line)) && !/^\s*[\|\+].+[\|\+]\s*$/.test(line))) {
        // 테이블 종료 및 처리
        if (tableDetected) {
          // 마크다운 구분자가 있는 테이블은 마크다운 테이블로 처리
          if (currentTableLines.some(tableLine => markdownSeparatorPattern.test(tableLine))) {
            processedLines.push(processMarkdownTable(currentTableLines));
          } 
          // 그 외는 ASCII 테이블로 처리
          else {
            processedLines.push(processAsciiTable(currentTableLines));
          }
        } else {
          // 테이블이 아닌 경우 그대로 보존
          processedLines.push(...currentTableLines);
        }
        
        // 현재 행 추가 및 테이블 상태 초기화
        if (line.trim()) processedLines.push(line);
        inTable = false;
        tableDetected = false;
        currentTableLines = [];
      } else {
        // 테이블 내부 행 추가
        currentTableLines.push(line);
      }
    } else {
      // 일반 텍스트
      processedLines.push(line);
    }
  }

  // 마지막 테이블 처리
  if (inTable && tableDetected) {
    if (currentTableLines.some(tableLine => markdownSeparatorPattern.test(tableLine))) {
      processedLines.push(processMarkdownTable(currentTableLines));
    } else {
      processedLines.push(processAsciiTable(currentTableLines));
    }
  } else if (inTable) {
    processedLines.push(...currentTableLines);
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

    // 출력 형식에 대한 지시사항 추가
    const enhancedPrompt = `${prompt}\n\n다음 가이드라인에 따라 응답해주세요:
1. 표로 작성해달라고 할경우에는 다음 규칙을 따릅니다 표로 작성해달라고 요청하지 않은경우 표를 생성하지 않습니다. 표 작성방법은 각 셀에 충분한 간격을 두고 내용을 입력해주세요. 표 아래 설명이나 참고사항은 표와 구분되도록 빈 줄을 추가하고, 단락을 나누어 작성해주세요.
2. 특수문자(**)를 텍스트 서식이 아닌 표기 용도로 사용할 경우 앞에 백슬래시(\\)를 추가해주세요. 예: \\** 
3. 중요한 내용은 각 문장이나 단락이 명확히 구분되도록 작성해주세요.`;

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
                text: enhancedPrompt
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
    
    // 텍스트 후처리: 에스케이프된 마크다운 문자 처리
    result = result.replace(/\\\*/g, '*'); // 이스케이프된 별표 처리
    
    // 줄바꿈 개선: 연속된 줄바꿈을 하나의 단락 구분으로 표준화
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // 테이블 외부 텍스트에 단락 구분 추가 개선
    result = result.replace(/(\*\*[\w\s]+\*\*:)/g, '\n\n$1');
    
    // ASCII/마크다운 테이블을 HTML 테이블로 변환
    result = convertToHtmlTable(result);
    
    // 추가 텍스트 처리 - 일반 텍스트 부분의 문단 포맷팅 개선
    result = processTextFormatting(result);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('프롬프트 실행 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' }, 
      { status: 500 }
    );
  }
}

// 일반 텍스트 포맷팅 개선 함수
function processTextFormatting(text: string): string {
  // HTML 테이블 바깥 부분만 처리하기 위해 임시 마커로 테이블 분리
  const tableMarker = '<!--TABLE_MARKER-->';
  let parts = [];
  let currentIndex = 0;
  
  // HTML 테이블 찾기
  const tableRegex = /<div class="table-responsive">[\s\S]*?<\/table><\/div>/g;
  let match;
  
  while ((match = tableRegex.exec(text)) !== null) {
    // 테이블 앞의 텍스트 처리
    if (match.index > currentIndex) {
      const beforeTable = text.substring(currentIndex, match.index);
      parts.push(processNonTableText(beforeTable));
    }
    
    // 테이블 자체는 그대로 유지
    parts.push(match[0]);
    currentIndex = match.index + match[0].length;
  }
  
  // 마지막 테이블 이후의 텍스트 처리
  if (currentIndex < text.length) {
    const afterLastTable = text.substring(currentIndex);
    parts.push(processNonTableText(afterLastTable));
  }
  
  return parts.join('');
}

// 테이블 외 텍스트 처리 함수
function processNonTableText(text: string): string {
  if (!text.trim()) return text;
  
  // 마크다운 볼드 구문 처리
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 마크다운 이탤릭 구문 처리
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // 줄바꿈 후 나오는 볼드 텍스트를 단락으로 처리
  text = text.replace(/\n\s*(\*\*.*?\*\*)/g, '\n\n$1');
  
  // 연속된 줄바꿈을 하나의 <p> 구분자로 변환
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n\n');
} 