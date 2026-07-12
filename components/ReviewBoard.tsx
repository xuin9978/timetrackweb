import React from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

interface ReviewBoardProps {
  onClose: () => void;
  onGenerate: () => void;
  onSave: () => void;
  status?: 'idle' | 'loading' | 'success' | 'error';
  loadStatus?: 'idle' | 'loading' | 'success' | 'error';
  saveStatus?: 'idle' | 'loading' | 'success' | 'error';
  markdown?: string;
  errorMessage?: string;
  saveMessage?: string;
  warnings?: string[];
  isDirty?: boolean;
}

const renderInlineMarkdown = (text: string) => {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return (
        <strong key={`${segment}-${index}`} className="font-semibold text-gray-900">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>;
  });
};

const renderDayJourneyMarkdown = (markdown: string) => {
  return markdown.split('\n').map((line, index) => {
    const trimmedLine = line.trim();
    const key = `${index}-${trimmedLine}`;

    if (!trimmedLine) {
      return <div key={key} className="h-3" />;
    }

    if (trimmedLine.startsWith('### ')) {
      return (
        <h3 key={key} className="mt-5 text-base font-semibold leading-7 text-gray-950 first:mt-0">
          {renderInlineMarkdown(trimmedLine.replace(/^###\s+/, ''))}
        </h3>
      );
    }

    if (trimmedLine.startsWith('## ')) {
      return (
        <h2 key={key} className="mb-2 text-lg font-semibold leading-8 text-gray-950">
          {renderInlineMarkdown(trimmedLine.replace(/^##\s+/, ''))}
        </h2>
      );
    }

    return (
      <p key={key} className="whitespace-pre-wrap text-sm leading-7 text-gray-800">
        {renderInlineMarkdown(line)}
      </p>
    );
  });
};

const ReviewBoard: React.FC<ReviewBoardProps> = ({
  onClose,
  onGenerate,
  onSave,
  status = 'idle',
  loadStatus = 'idle',
  saveStatus = 'idle',
  markdown = '',
  errorMessage = '',
  saveMessage = '',
  warnings = [],
  isDirty = false
}) => {
  const hasMarkdown = markdown.trim().length > 0;
  const isLoading = status === 'loading';
  const isLoadingSaved = loadStatus === 'loading';
  const isSaving = saveStatus === 'loading';
  const generateLabel = hasMarkdown ? '重新生成' : '生成一天之旅';
  const canSave = hasMarkdown && !isLoading && !isSaving && isDirty;

  return (
    <GlassCard
      intensity="medium"
      className="review-board w-full md:absolute md:right-0 md:top-0 md:w-[550px] md:h-[85vh] flex flex-col bg-white z-40 animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || isSaving}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-black px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icons.RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? '生成中...' : generateLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭回顾"
          title="关闭回顾"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black transition-all duration-200 active:scale-95"
        >
          <Icons.X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {hasMarkdown && (
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icons.Check size={14} />
              {isSaving ? '保存中...' : isDirty ? '保存' : '已保存'}
            </button>
          )}

          {(saveMessage || (hasMarkdown && isDirty)) && (
            <span className={`text-xs font-medium ${saveStatus === 'error' ? 'text-red-500' : isDirty ? 'text-amber-600' : 'text-gray-500'}`}>
              {saveMessage || '未保存'}
            </span>
          )}
        </div>

        {isLoadingSaved && status !== 'loading' && (
          <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500">
            正在读取已保存内容...
          </div>
        )}

        {status === 'loading' && (
          <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500">
            生成中...
          </div>
        )}

        {status === 'error' && !isLoadingSaved && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">
            {errorMessage || '一天之旅生成失败，请稍后重试'}
          </div>
        )}

        {status !== 'loading' && status !== 'error' && markdown && (
          <article className="space-y-1">
            {renderDayJourneyMarkdown(markdown)}
          </article>
        )}

        {status === 'idle' && !isLoadingSaved && !markdown && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-500">
            当前日期还没有保存的一天之旅。点击「生成一天之旅」后，可手动保存到当前日期。
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
            生成结果存在格式提醒：{warnings.join('；')}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default ReviewBoard;
