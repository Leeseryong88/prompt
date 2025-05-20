'use client';

import { useState } from 'react';

interface FollowUpInputProps {
  onSubmit: (followUpPrompt: string) => void;
  isLoading: boolean;
}

export default function FollowUpInput({ onSubmit, isLoading }: FollowUpInputProps) {
  const [followUpPrompt, setFollowUpPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpPrompt.trim()) {
      onSubmit(followUpPrompt);
      setFollowUpPrompt(''); // 전송 후 입력 필드 초기화
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="followUpPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            후속 질문 또는 요청
          </label>
          <textarea
            id="followUpPrompt"
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="실행 결과에 대해 추가 질문을 하거나 요청사항을 입력하세요..."
            value={followUpPrompt}
            onChange={(e) => setFollowUpPrompt(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !followUpPrompt.trim()}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                전송 중...
              </>
            ) : (
              '전송'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 