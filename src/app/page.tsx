'use client';

import { useState, useEffect } from 'react';
import PromptInput from './components/PromptInput';
import ResultDisplay from './components/ResultDisplay';
import HistoryModal from './components/HistorySidebar';
import usePromptHistory from './hooks/usePromptHistory';
import { parseEnhancedPrompt } from './utils/promptUtils';
import { PromptHistoryItem, ParsedPrompt } from './types';

export default function Home() {
  // 상태 관리
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [parsedPrompt, setParsedPrompt] = useState<ParsedPrompt | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // 히스토리 관리 훅 사용
  const { 
    history, 
    addHistoryItem, 
    updateEnhancedPrompt,
    updateExecutionResult, 
    removeHistoryItem, 
    clearHistory, 
    getHistoryItem 
  } = usePromptHistory();

  // 히스토리 항목 선택 처리
  const handleSelectHistoryItem = (item: PromptHistoryItem) => {
    setCurrentPrompt(item.originalPrompt);
    setEnhancedPrompt(item.enhancedPrompt);
    setExecutionResult(item.executionResult);
    setActiveHistoryId(item.id);
    
    // 개선된 프롬프트를 다시 파싱
    setParsedPrompt(parseEnhancedPrompt(item.enhancedPrompt));
    setIsHistoryModalOpen(false);
  };

  // 새로운 질문 시작 처리 함수
  const handleNewChat = () => {
    setCurrentPrompt('');
    setEnhancedPrompt(null);
    setExecutionResult(null);
    setParsedPrompt(null);
    setActiveHistoryId(null); // 활성 히스토리 ID 초기화
    setIsHistoryModalOpen(false); // 모달 닫기 (HistoryModal에서도 처리하지만 중복 호출해도 괜찮음)
  };

  // 프롬프트 개선 함수
  const enhancePrompt = async (prompt: string) => {
    setIsEnhancing(true);
    setCurrentPrompt(prompt);
    setActiveHistoryId(null);
    
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '알 수 없는 오류');
      }

      const data = await response.json();
      const enhancedText = data.enhancedPrompt;
      
      console.log('API 응답 원본 길이:', enhancedText ? enhancedText.length : 0);
      console.log('API 응답 원본 샘플:', enhancedText ? enhancedText.substring(0, 200) + '...' : 'null');
      
      setEnhancedPrompt(enhancedText);
      
      // 개선된 프롬프트 파싱
      const parsed = parseEnhancedPrompt(enhancedText);
      console.log('파싱된 프롬프트:', { 
        original: enhancedText ? enhancedText.substring(0, 100) + '...' : 'null', 
        mainPrompt: parsed.mainPrompt ? parsed.mainPrompt.substring(0, 100) + '...' : 'null', 
        explanation: parsed.explanation ? parsed.explanation.substring(0, 100) + '...' : 'null',
        mainPromptLength: parsed.mainPrompt ? parsed.mainPrompt.length : 0,
        explanationLength: parsed.explanation ? parsed.explanation.length : 0,
        containsRoleHeader: parsed.mainPrompt ? parsed.mainPrompt.includes('**[역할]**') : false,
        containsGoalHeader: parsed.mainPrompt ? parsed.mainPrompt.includes('**[목표]**') : false,
      });
      
      setParsedPrompt(parsed);
      
      // 히스토리에 저장
      const historyId = addHistoryItem(prompt, enhancedText);
      setActiveHistoryId(historyId);
      
      // 실행 결과 초기화
      setExecutionResult(null);
    } catch (error) {
      console.error('프롬프트 개선 중 오류 발생:', error);
      alert(`프롬프트 개선 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  // 수정된 개선 프롬프트 저장 처리
  const handleSaveEnhancedPrompt = (newEnhancedPrompt: string) => {
    if (!activeHistoryId) return;
    
    // 상태 업데이트
    setEnhancedPrompt(newEnhancedPrompt);
    const newParsed = parseEnhancedPrompt(newEnhancedPrompt);
    setParsedPrompt(newParsed);
    
    // 히스토리 업데이트
    updateEnhancedPrompt(activeHistoryId, newEnhancedPrompt);
    
    // 실행 결과는 유지하거나 초기화할 수 있음 (여기서는 유지)
    // setExecutionResult(null); 
  };

  // 후속 프롬프트 제출 처리 함수
  const handleFollowUpSubmit = async (followUpPrompt: string) => {
    if (!activeHistoryId || !enhancedPrompt || !executionResult) return;

    setIsFollowingUp(true);

    // 대화 형식으로 이전 프롬프트와 결과를 조합
    const conversationHistory = `이전 프롬프트: ${parsedPrompt?.mainPrompt || enhancedPrompt}\n\n이전 응답: ${executionResult}\n\n---\n\n사용자 요청: ${followUpPrompt}`;

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: conversationHistory }), // 전체 대화 내용 전송
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '알 수 없는 오류');
      }

      const data = await response.json();
      const newResult = data.result;

      // 현재 실행 결과에 새로운 응답 추가 (줄바꿈으로 구분)
      const updatedExecutionResult = `${executionResult}\n\n---\n\n**후속 요청:** ${followUpPrompt}\n\n**응답:**\n${newResult}`;
      
      setExecutionResult(updatedExecutionResult);
      updateExecutionResult(activeHistoryId, updatedExecutionResult); // 히스토리 업데이트

    } catch (error) {
      console.error('후속 프롬프트 처리 중 오류 발생:', error);
      alert(`후속 프롬프트 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsFollowingUp(false);
    }
  };

  // 최초 프롬프트 실행 함수
  const executePrompt = async () => {
    if (!enhancedPrompt || !activeHistoryId) return;
    
    setIsExecuting(true);
    
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: parsedPrompt?.mainPrompt || enhancedPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '알 수 없는 오류');
      }

      const data = await response.json();
      const result = data.result;
      
      // 실행 결과 설정 및 히스토리 업데이트
      setExecutionResult(result);
      updateExecutionResult(activeHistoryId, result);
    } catch (error) {
      console.error('프롬프트 실행 중 오류 발생:', error);
      alert(`프롬프트 실행 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI 활용 능력 부스터</h1>
            <p className="text-gray-600 dark:text-gray-400">
              질문 개선을 통해 AI로부터 더 정확하고 유용한 답변을 얻으세요.
            </p>
          </header>

          <main className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <PromptInput 
              onSubmit={enhancePrompt} 
              isLoading={isEnhancing} 
              initialValue={currentPrompt}
            />
            
            <ResultDisplay 
              enhancedPrompt={enhancedPrompt}
              executionResult={executionResult}
              onExecute={executePrompt}
              onSaveEnhancedPrompt={handleSaveEnhancedPrompt}
              onFollowUpSubmit={handleFollowUpSubmit}
              isExecuting={isExecuting}
              isFollowingUp={isFollowingUp}
              parsedPrompt={parsedPrompt}
            />
          </main>

          <footer className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>프롬프트 개선 도구 &copy; {new Date().getFullYear()}</p>
          </footer>
        </div>
      </div>
      
      {/* 히스토리 열기 버튼 (우측 하단 플로팅 버튼) */}
      <button
        onClick={() => setIsHistoryModalOpen(true)}
        className="fixed bottom-6 right-6 z-30 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        aria-label="히스토리 보기"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </button>
      
      {/* 히스토리 모달 */}
      <HistoryModal 
        history={history}
        onSelectItem={handleSelectHistoryItem} 
        onDeleteItem={removeHistoryItem}
        onClearHistory={clearHistory}
        onNewChat={handleNewChat}
        activeItemId={activeHistoryId}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
