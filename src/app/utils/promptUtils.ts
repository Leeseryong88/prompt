import { ParsedPrompt } from '../types';

// 개선된 프롬프트와 개선 이유를 분리하는 함수
export function parseEnhancedPrompt(text: string | null): ParsedPrompt {
  if (!text) return { mainPrompt: '', explanation: null };
  
  console.log('파싱 시작:', text.substring(0, 100) + '...');
  
  // 마커 기반 파싱 시도
  const promptStartMarker = '---PROMPT_START---';
  const promptEndMarker = '---PROMPT_END---';
  const reasonStartMarker = '---REASON_START---';
  const reasonEndMarker = '---REASON_END---';
  
  // 시작 마커만 있는 경우에도 파싱을 시도합니다.
  if (text.includes(promptStartMarker)) {
    const startIndex = text.indexOf(promptStartMarker) + promptStartMarker.length;
    let endIndex;
    
    // 종료 마커가 있는 경우
    if (text.includes(promptEndMarker)) {
      endIndex = text.indexOf(promptEndMarker);
    } else if (text.includes(reasonStartMarker)) {
      // 종료 마커는 없지만 이유 시작 마커가 있는 경우
      endIndex = text.indexOf(reasonStartMarker);
    } else {
      // 모든 마커가 없는 경우 끝까지 사용
      endIndex = text.length;
    }
    
    const mainPrompt = text.substring(startIndex, endIndex).trim();
    
    // 이유 부분 파싱
    let explanation = null;
    if (text.includes(reasonStartMarker)) {
      const reasonStartIndex = text.indexOf(reasonStartMarker) + reasonStartMarker.length;
      const reasonEndIndex = text.includes(reasonEndMarker) ? text.indexOf(reasonEndMarker) : text.length;
      explanation = text.substring(reasonStartIndex, reasonEndIndex).trim();
    }
    
    if (mainPrompt) {
      console.log('부분 마커 기반 파싱 성공:', { 
        mainPromptLength: mainPrompt.length,
        explanationLength: explanation ? explanation.length : 0
      });
      return { mainPrompt, explanation };
    }
  }
  
  // 전체 마커가 있는 경우 마커 기반 파싱
  const promptStartIndex = text.indexOf(promptStartMarker);
  const promptEndIndex = text.indexOf(promptEndMarker);
  const reasonStartIndex = text.indexOf(reasonStartMarker);
  const reasonEndIndex = text.indexOf(reasonEndMarker);
  
  if (promptStartIndex !== -1 && promptEndIndex !== -1 &&
      reasonStartIndex !== -1 && reasonEndIndex !== -1) {
    const mainPrompt = text.substring(
      promptStartIndex + promptStartMarker.length, 
      promptEndIndex
    ).trim();
    
    const explanation = text.substring(
      reasonStartIndex + reasonStartMarker.length, 
      reasonEndIndex
    ).trim();
    
    console.log('마커 기반 파싱 성공:', { 
      mainPromptLength: mainPrompt.length,
      explanationLength: explanation.length
    });
    
    return { mainPrompt, explanation };
  }
  
  // 마커 기반 파싱 실패 시 특수 형식 파싱 시도
  // 특수 헤더 형식 (예: **[역할]**, **[목표]**) 파싱
  const roleHeaderMatch = text.match(/\*\*\[\s*역할\s*\]\*\*|\#\#?\s*역할|역할\s*\:/i);
  const goalHeaderMatch = text.match(/\*\*\[\s*목표\s*\]\*\*|\*\*\[\s*작업\s*\]\*\*|\#\#?\s*목표|\#\#?\s*작업|목표\s*\:|작업\s*\:/i);
  const reasonHeaderMatch = text.match(/\*\*\[\s*개선\s*이유\s*\]\*\*|\*\*\[\s*이유\s*\]\*\*|\#\#?\s*개선\s*이유|\#\#?\s*이유|개선\s*이유\s*\:|이유\s*\:/i);
  
  // 역할과 목표 헤더가 있지만 이유 헤더가 없는 경우 - 전체를 프롬프트로 간주
  if ((roleHeaderMatch || goalHeaderMatch) && !reasonHeaderMatch) {
    console.log('역할/목표 헤더만 발견, 전체를 메인 프롬프트로 간주');
    return { mainPrompt: text, explanation: null };
  }
  
  // 역할과 이유 헤더가 모두 있는 경우 - 구분하여 파싱
  if (roleHeaderMatch && reasonHeaderMatch) {
    const roleHeaderIndex = roleHeaderMatch.index || 0;
    const reasonHeaderIndex = reasonHeaderMatch.index || text.length;
    
    if (roleHeaderIndex < reasonHeaderIndex) {
      const mainPrompt = text.substring(roleHeaderIndex, reasonHeaderIndex).trim();
      const explanation = text.substring(reasonHeaderIndex).trim();
      
      console.log('특수 헤더 기반 파싱 성공:', { 
        mainPromptLength: mainPrompt.length,
        explanationLength: explanation.length
      });
      
      return { mainPrompt, explanation };
    }
  }
  
  // 마커 기반 파싱 실패 시 기존 방식으로 진행
  console.log('마커 기반 파싱 실패, 기존 방식으로 파싱 시도');
  
  // 명확한 구분자가 없는 경우 역할/목표 구분으로 시도
  // 역할 부분만 있는 경우 (개선 이유가 없는 경우)
  const rolePattern = /\*\*\[\s*역할\s*\]\*\*/i;
  if (rolePattern.test(text)) {
    console.log('역할 구분자만 발견, 전체를 메인 프롬프트로 간주');
    return { mainPrompt: text, explanation: null };
  }
  
  // 먼저 JSON 형식으로 파싱 시도
  try {
    // 텍스트에서 JSON 부분만 추출
    let jsonText = text;
    
    // ```json 블록이 있는 경우 해당 내용만 추출
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonBlockMatch = text.match(jsonBlockRegex);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonText = jsonBlockMatch[1].trim();
    } else {
      // 일반 코드 블록이 있는 경우
      const codeBlockRegex = /```\s*([\s\S]*?)\s*```/;
      const codeBlockMatch = text.match(codeBlockRegex);
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonText = codeBlockMatch[1].trim();
      }
    }

    const parsedJson = JSON.parse(jsonText);
    
    if (parsedJson.enhancedPrompt && parsedJson.explanation) {
      console.log('JSON 파싱 성공');
      return {
        mainPrompt: parsedJson.enhancedPrompt.trim(),
        explanation: parsedJson.explanation.trim()
      };
    }
  } catch (error) {
    // JSON 파싱 실패 시 기존 방식으로 진행
    console.log('JSON 파싱 실패, 구분자 방식으로 파싱합니다.', error);
  }
  
  // 기존 방식: 구분자를 사용하여 프롬프트와 이유 분리
  const markers = [
    '개선 이유:', '개선이유:', '개선 사항:', '개선사항:', 
    '변경 사항:', '변경사항:', '개선점:', '설명:', 
    '이유:', '분석:', '참고:', '노트:'
  ];
  
  // 개선 이유 구분자 찾기
  let splitIndex = -1;
  let foundMarker = '';
  
  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index !== -1 && (splitIndex === -1 || index < splitIndex)) {
      splitIndex = index;
      foundMarker = marker;
    }
  }
  
  // 구분자가 발견되면 분리, 아니면 전체를 메인 프롬프트로 간주
  if (splitIndex !== -1) {
    const mainPrompt = text.substring(0, splitIndex).trim();
    const explanation = text.substring(splitIndex).trim();
    console.log('구분자 기반 파싱 성공:', { foundMarker });
    return { mainPrompt, explanation };
  } else {
    // 구분자가 없는 경우, 빈 줄로 구분 시도
    const emptyLineRegex = /\n\s*\n/;
    const emptyLineMatch = text.match(emptyLineRegex);
    
    if (emptyLineMatch && emptyLineMatch.index && emptyLineMatch.index > 0) {
      // 빈 줄을 기준으로 분리하되, 문서의 앞부분 2/3까지만 탐색
      const searchLimit = Math.floor(text.length * 2/3);
      const emptyLineIndex = emptyLineMatch.index;
      
      if (emptyLineIndex < searchLimit) {
        const mainPrompt = text.substring(0, emptyLineIndex).trim();
        const explanation = text.substring(emptyLineIndex).trim();
        if (explanation.length > 20) { // 설명이 어느 정도 길이가 있는 경우에만
          console.log('빈 줄 기반 파싱 성공');
          return { mainPrompt, explanation };
        }
      }
    }
    
    // 다른 분리 시도가 실패하면 전체를 메인 프롬프트로 간주
    console.log('모든 파싱 시도 실패, 전체를 메인 프롬프트로 간주');
    return { mainPrompt: text, explanation: null };
  }
} 