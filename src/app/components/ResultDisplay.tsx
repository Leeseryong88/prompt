'use client';

import { useState, useEffect, ReactNode, ReactElement } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import parse from 'html-react-parser';
import { ParsedPrompt } from '../types';
import CopyButton from './CopyButton';
import FollowUpInput from './FollowUpInput';

interface ResultDisplayProps {
  enhancedPrompt: string | null;
  executionResult: string | null;
  onExecute: () => void;
  onEdit?: () => void;
  onSaveEnhancedPrompt: (newEnhancedPrompt: string) => void;
  onFollowUpSubmit: (followUpPrompt: string) => void;
  isExecuting: boolean;
  isFollowingUp: boolean;
  parsedPrompt: ParsedPrompt | null;
}

// 개선된 프롬프트와 개선 이유를 분리하는 함수
function parseEnhancedPrompt(text: string | null): { 
  mainPrompt: string; 
  explanation: string | null;
} {
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

// Markdown 렌더링 컴포넌트 옵션
const markdownComponents: Options['components'] = {
  code({node, className, children, ...props}) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');
    
    return (
      <div className="my-4 rounded-md overflow-hidden bg-gray-800">
        <div className="flex justify-between items-center bg-gray-700 px-4 py-1.5 text-xs text-gray-200">
          <span>{language || 'code'}</span>
          <CopyButton text={codeString} className="!bg-gray-600 !text-gray-200" />
        </div>
        <pre className="p-4 overflow-x-auto text-gray-100 text-sm !bg-gray-800 !text-white">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  // 문단 (p) 태그 스타일링: 위아래 마진 추가
  p: ({node, ...props}) => <p className="mb-4" {...props} />,
  // 목록 항목 (li) 태그 스타일링: 아래 마진 추가
  li: ({node, ...props}) => <li className="mb-2" {...props} />,
  // 테이블 스타일링
  table: ({node, ...props}) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700" {...props} />
    </div>
  ),
  // 테이블 헤더 스타일링
  thead: ({node, ...props}) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
  // 테이블 헤더 셀 스타일링
  th: ({node, ...props}) => (
    <th 
      className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100" 
      {...props} 
    />
  ),
  // 테이블 바디 스타일링
  tbody: ({node, ...props}) => <tbody className="bg-white dark:bg-gray-900" {...props} />,
  // 테이블 행 스타일링
  tr: ({node, ...props}) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800" {...props} />,
  // 테이블 셀 스타일링
  td: ({node, ...props}) => (
    <td 
      className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-gray-100" 
      {...props} 
    />
  ),
};

export default function ResultDisplay({
  enhancedPrompt,
  executionResult,
  onExecute,
  onEdit,
  onSaveEnhancedPrompt,
  onFollowUpSubmit,
  isExecuting,
  isFollowingUp,
  parsedPrompt
}: ResultDisplayProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);
  const [resultPreviewLength, setResultPreviewLength] = useState(1000); // 기본 미리보기 길이
  const [resultHeight, setResultHeight] = useState<string>('500px'); // 결과 영역 높이 상태
  const [isFullScreen, setIsFullScreen] = useState(false); // 전체 화면 상태
  const [isEditingEnhanced, setIsEditingEnhanced] = useState(false);
  const [editedMainPrompt, setEditedMainPrompt] = useState<string>('');
  
  // parsedPrompt가 변경되면 editedMainPrompt 초기화 (히스토리 선택 시 등)
  useEffect(() => {
    if (parsedPrompt) {
      setEditedMainPrompt(parsedPrompt.mainPrompt);
    }
  }, [parsedPrompt]);

  // 실행 결과가 변경될 때마다 포맷팅
  useEffect(() => {
    if (executionResult) {
      // 결과 길이에 따라 높이 조정
      if (executionResult.length > 10000) {
        setResultHeight('700px');
      } else if (executionResult.length > 5000) {
        setResultHeight('600px');
      } else {
        setResultHeight('500px');
      }
    } 
  }, [executionResult]);
  
  if (!enhancedPrompt || !parsedPrompt) return null;
  
  const { mainPrompt, explanation } = parsedPrompt;

  const handleEditToggle = () => {
    if (isEditingEnhanced) {
      // 저장 로직
      // 원본 explanation을 유지하면서 mainPrompt만 교체
      const fullEnhancedPrompt = explanation 
        ? `${editedMainPrompt}\n\n${explanation}` 
        : editedMainPrompt;
      onSaveEnhancedPrompt(fullEnhancedPrompt);
      setIsEditingEnhanced(false);
    } else {
      // 편집 시작
      setEditedMainPrompt(mainPrompt);
      setIsEditingEnhanced(true);
    }
  };

  // 실행 결과 내용 처리
  const renderExecutionResult = () => {
    if (!executionResult) return null;
    
    const contentToRender = isResultCollapsed && executionResult.length > resultPreviewLength
      ? `${executionResult.substring(0, resultPreviewLength)}...`
      : executionResult;

    // HTML 테이블 태그를 포함하는지 확인
    const containsHtmlTable = /<table|<div class="table/.test(contentToRender);
    
    if (containsHtmlTable) {
      // HTML이 포함된 경우 dangerouslySetInnerHTML로 처리
      return (
        <div className="markdown-content">
          <style jsx global>{`
            .markdown-content table {
              min-width: 100%;
              border-collapse: collapse;
              border: 1px solid #e2e8f0;
              margin-bottom: 1.5rem;
              table-layout: fixed;
              word-break: break-word;
            }
            .markdown-content .table-responsive {
              overflow-x: auto;
              margin-bottom: 1.5rem;
            }
            .markdown-content th {
              background-color: #f7fafc;
              color: #1a202c;
              font-weight: 600;
              padding: 0.75rem 1rem;
              text-align: left;
              border: 1px solid #e2e8f0;
              white-space: normal;
              vertical-align: middle;
              line-height: 1.5;
            }
            .markdown-content td {
              padding: 0.75rem 1rem;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
              line-height: 1.5;
              white-space: normal;
            }
            .markdown-content td p, .markdown-content th p {
              margin: 0;
              padding: 0;
            }
            .markdown-content td strong, .markdown-content th strong {
              font-weight: 600;
            }
            .markdown-content tr:hover {
              background-color: #f7fafc;
            }
            .dark .markdown-content table {
              border-color: #4a5568;
            }
            .dark .markdown-content th {
              background-color: #2d3748;
              color: #f7fafc;
              border-color: #4a5568;
            }
            .dark .markdown-content td {
              border-color: #4a5568;
              color: #f7fafc;
            }
            .dark .markdown-content tr:hover {
              background-color: #2d3748;
            }
            
            /* 설명 텍스트 스타일 개선 */
            .markdown-content p {
              margin-bottom: 1rem;
              line-height: 1.6;
            }
            .markdown-content strong {
              font-weight: 600;
              color: #2c5282;
            }
            .dark .markdown-content strong {
              color: #90cdf4;
            }
            .markdown-content em {
              font-style: italic;
              color: #4a5568;
            }
            .dark .markdown-content em {
              color: #cbd5e0;
            }
            /* 설명 문단 사이 간격 */
            .markdown-content p + p {
              margin-top: 0.75rem;
            }
            /* 표 다음 나오는 첫 문단에 추가 여백 */
            .markdown-content .table-responsive + p {
              margin-top: 1.5rem;
            }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: contentToRender }} />
        </div>
      );
    }
      
    // 일반 마크다운 렌더링
    return (
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {contentToRender}
      </ReactMarkdown>
    );
  };

  // 전체 화면 토글
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // 결과 영역의 최대 높이를 결정하는 클래스
  const getResultAreaClass = () => {
    const baseClass = "bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700 overflow-y-auto text-gray-900 dark:text-gray-100";
    
    if (isFullScreen) {
      return `${baseClass} h-[calc(100vh-120px)]`;
    }
    
    if (resultHeight === '500px') {
      return `${baseClass} max-h-[500px]`;
    } else if (resultHeight === '600px') {
      return `${baseClass} max-h-[600px]`;
    } else if (resultHeight === '700px') {
      return `${baseClass} max-h-[700px]`;
    } else {
      return `${baseClass} max-h-[1000px]`;
    }
  };

  return (
    <div className="w-full space-y-6 mt-8">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">개선된 프롬프트</h2>
          <CopyButton text={mainPrompt} label="프롬프트 복사" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700 min-h-[100px] whitespace-pre-wrap">
          {isEditingEnhanced ? (
            <textarea
              value={editedMainPrompt}
              onChange={(e) => setEditedMainPrompt(e.target.value)}
              className="w-full h-40 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              rows={5}
            />
          ) : (
            <div className="max-h-[1200px] overflow-y-auto">
              {mainPrompt ? (
                <ReactMarkdown 
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {mainPrompt}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">프롬프트 내용을 불러올 수 없습니다.</p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {showExplanation ? '개선 이유 숨기기' : '개선 이유 보기'}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleEditToggle}
              className="inline-flex items-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              {isEditingEnhanced ? '저장하기' : '수정하기'}
            </button>
            <button
              onClick={onExecute}
              disabled={isExecuting || isEditingEnhanced}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  실행 중...
                </>
              ) : (
                '실행하기'
              )}
            </button>
          </div>
        </div>
        
        {showExplanation && explanation && (
          <div className="mt-4 bg-yellow-50 dark:bg-gray-800 rounded p-4 border border-yellow-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">개선 이유</h3>
              <CopyButton text={explanation} label="이유 복사" />
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="max-h-[500px] overflow-y-auto">
                {explanation ? (
                  <ReactMarkdown 
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {explanation}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">개선 이유를 불러올 수 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {executionResult && (
        <div 
          className={`${isFullScreen ? 'fixed inset-0 z-50 p-4 bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700'} transition-all duration-300`}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">실행 결과</h2>
            <div className="flex items-center gap-2">
              <CopyButton text={executionResult} label="결과 복사" />
              <button
                onClick={toggleFullScreen}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
              >
                {isFullScreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M15 9H19.5M15 9V4.5M15 15H9M15 15v4.5M15 15h4.5M9 15H4.5m4.5 0v4.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m9 0v4.5m0-4.5h4.5M3.75 16.5v4.5m0-4.5h4.5m9 0v4.5m0-4.5h4.5" />
                  </svg>
                )}
                {isFullScreen ? '축소하기' : '전체화면'}
              </button>
              <button
                onClick={() => setIsResultCollapsed(!isResultCollapsed)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
              >
                {isResultCollapsed ? '전체 내용 보기' : '간략히 보기'}
              </button>
            </div>
          </div>
          <div className={getResultAreaClass()}>
            {renderExecutionResult()}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>총 {executionResult.length.toLocaleString()}자</span>
            <button
              onClick={() => setResultHeight(prev => prev === '500px' ? '1000px' : '500px')}
              className={`text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none ${isFullScreen ? 'hidden' : ''}`}
            >
              {resultHeight === '500px' ? '더 크게 보기' : '작게 보기'}
            </button>
          </div>
          
          <FollowUpInput onSubmit={onFollowUpSubmit} isLoading={isFollowingUp} />
        </div>
      )}
    </div>
  );
} 