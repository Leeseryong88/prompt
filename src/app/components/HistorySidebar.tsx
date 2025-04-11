'use client';

import { PromptHistoryItem } from '../types';
import { formatDate } from '../utils/dateUtils';

interface HistoryModalProps {
  history: PromptHistoryItem[];
  onSelectItem: (item: PromptHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  onNewChat: () => void;
  activeItemId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryModal({
  history,
  onSelectItem,
  onDeleteItem,
  onClearHistory,
  onNewChat,
  activeItemId,
  isOpen,
  onClose,
}: HistoryModalProps) {

  // 히스토리 항목의 제목 생성 (원본 프롬프트의 첫 30자)
  const getItemTitle = (prompt: string) => {
    const maxLength = 30;
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
  };

  const handleItemSelect = (item: PromptHistoryItem) => {
    onSelectItem(item);
    onClose(); // 항목 선택 시 모달 닫기
  };

  const handleNewChatClick = () => {
    onNewChat();
    onClose(); // 새 채팅 시작 시 모달 닫기
  };

  if (!isOpen) return null;

  return (
    // 모달 오버레이
    <div 
      className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose} // 오버레이 클릭 시 닫기
    >
      {/* 모달 컨텐츠 */} 
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 닫힘 방지
      >
        {/* 모달 헤더 */} 
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">프롬프트 히스토리</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">최근 10개의 프롬프트만 저장됩니다</p>
          </div>
          <div className="flex items-center gap-4">
            {/* 새로운 질문하기 버튼 */} 
            <button
              onClick={handleNewChatClick} // 핸들러 연결
              className="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-900/50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              새로운 질문하기
            </button>
            
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
              >
                모든 기록 삭제
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white focus:outline-none"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 모달 바디 (스크롤 영역) */} 
        <div className="overflow-y-auto flex-grow">
          {history.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              저장된 프롬프트가 없습니다
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((item) => (
                <li 
                  key={item.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 relative ${
                    activeItemId === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <button
                    onClick={() => handleItemSelect(item)} // 수정된 핸들러 사용
                    className="block w-full text-left p-4 pr-12"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">
                      {getItemTitle(item.originalPrompt)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.lastUpdatedAt)}
                    </div>
                    {item.executionResult && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          실행됨
                        </span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="absolute top-1/2 right-4 transform -translate-y-1/2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none"
                    aria-label="항목 삭제"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      strokeWidth={1.5} 
                      stroke="currentColor" 
                      className="w-5 h-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 