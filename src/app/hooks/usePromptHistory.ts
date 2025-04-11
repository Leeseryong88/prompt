'use client';

import { useState, useEffect } from 'react';
import { PromptHistoryItem } from '../types';

const STORAGE_KEY = 'prompt-enhancer-history';

export default function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  
  // 앱 로드 시 localStorage에서 히스토리 불러오기
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('히스토리 로드 중 오류 발생:', error);
    }
  }, []);
  
  // 히스토리 변경시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('히스토리 저장 중 오류 발생:', error);
    }
  }, [history]);
  
  // 새 항목 추가
  const addHistoryItem = (originalPrompt: string, enhancedPrompt: string) => {
    const newItem: PromptHistoryItem = {
      id: Date.now().toString(),
      originalPrompt,
      enhancedPrompt,
      executionResult: null,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };
    
    setHistory(prev => [newItem, ...prev]);
    return newItem.id;
  };
  
  // 개선된 프롬프트 업데이트
  const updateEnhancedPrompt = (id: string, newEnhancedPrompt: string) => {
    setHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? {
              ...item,
              enhancedPrompt: newEnhancedPrompt,
              lastUpdatedAt: new Date().toISOString()
            }
          : item
      )
    );
  };
  
  // 실행 결과 업데이트
  const updateExecutionResult = (id: string, executionResult: string) => {
    // 빈 문자열인 경우 null로 저장
    const resultToSave = executionResult.trim() === '' ? null : executionResult;
    
    setHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? {
              ...item,
              executionResult: resultToSave,
              lastUpdatedAt: new Date().toISOString()
            }
          : item
      )
    );
  };
  
  // 항목 삭제
  const removeHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };
  
  // 히스토리 모두 삭제
  const clearHistory = () => {
    setHistory([]);
  };
  
  // 특정 ID의 히스토리 항목 가져오기
  const getHistoryItem = (id: string): PromptHistoryItem | undefined => {
    return history.find(item => item.id === id);
  };
  
  return {
    history,
    addHistoryItem,
    updateEnhancedPrompt,
    updateExecutionResult,
    removeHistoryItem,
    clearHistory,
    getHistoryItem
  };
} 