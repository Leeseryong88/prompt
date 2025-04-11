import { ParsedPrompt } from '../types';

// 개선된 프롬프트와 개선 이유를 분리하는 함수
export function parseEnhancedPrompt(text: string | null): ParsedPrompt {
  if (!text) return { mainPrompt: '', explanation: null };
  
  // 일반적으로 개선된 프롬프트는 앞부분에, 이유는 뒷부분에 위치하는 경우가 많음
  // "개선된 프롬프트:", "개선 이유:" 등의 구분자를 찾아 분리
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
    return { mainPrompt, explanation };
  } else {
    return { mainPrompt: text, explanation: null };
  }
} 