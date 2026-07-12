import React, { useEffect, useMemo, useState } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { CalendarEvent, Tag } from '../types';
import { formatDurationFromMinutes, getDurationInMinutes } from '../utils/dateUtils';
import { formatChinaDateKey } from '../utils/timezoneUtils';

interface AIDailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelTitle: string;
  events: CalendarEvent[];
  comparisonEvents: CalendarEvent[];
  referenceDate: Date;
  tags: Tag[];
}

type FeedbackType = 'helpful' | 'inaccurate' | 'vague' | 'not_actionable';
type ReviewStatus = 'idle' | 'loading' | 'success' | 'error';

interface RemoteReview {
  summary?: string;
  time_distribution?: Array<{
    label: string;
    duration_minutes: number;
    ratio?: number;
    observation?: string;
  }>;
  insights?: Array<{
    title: string;
    detail?: string;
    evidence?: string;
  }>;
  risks?: Array<{
    risk: string;
    reason?: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  actions?: Array<{
    action: string;
    why?: string;
    scope?: 'tomorrow' | 'next_week';
  }>;
  caveats?: string[];
}

const feedbackCopy: Record<FeedbackType, string> = {
  helpful: '有帮助',
  inaccurate: '不准确',
  vague: '太空泛',
  not_actionable: '建议不可执行'
};

const normalizeString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const getArrayField = (source: Record<string, unknown>, primary: string, fallback: string) => {
  if (Array.isArray(source[primary])) return source[primary] as unknown[];
  if (Array.isArray(source[fallback])) return source[fallback] as unknown[];
  return [];
};

const normalizeRemoteReview = (value: unknown): RemoteReview => {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const observationSource = getArrayField(source, 'evidence_based_observations', 'insights');
  const actionSource = getArrayField(source, 'tomorrow_actions', 'actions');
  const limitationSource = getArrayField(source, 'data_limitations', 'caveats');

  return {
    summary: normalizeString(source.summary),
    time_distribution: Array.isArray(source.time_distribution)
      ? source.time_distribution.map((item, index) => {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            return {
              label: normalizeString(record.label, `分类 ${index + 1}`),
              duration_minutes: typeof record.duration_minutes === 'number' ? record.duration_minutes : 0,
              ratio: typeof record.ratio === 'number' ? record.ratio : undefined,
              observation: normalizeString(record.observation)
            };
          }
          return {
            label: `分类 ${index + 1}`,
            duration_minutes: 0,
            observation: normalizeString(item)
          };
        })
      : [],
    insights: observationSource
      .map((item, index) => {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            return {
              title: normalizeString(record.title, `观察 ${index + 1}`),
              detail: normalizeString(record.detail),
              evidence: normalizeString(record.evidence, '基于当前时间记录与标签统计。')
            };
          }
          return {
            title: `观察 ${index + 1}`,
            detail: normalizeString(item),
            evidence: '基于当前时间记录与标签统计。'
          };
        }),
    risks: Array.isArray(source.risks)
      ? source.risks.map(item => {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            return {
              risk: normalizeString(record.risk, '暂未识别到明确风险'),
              reason: normalizeString(record.reason),
              severity: record.severity === 'low' || record.severity === 'medium' || record.severity === 'high' ? record.severity : undefined
            };
          }
          return {
            risk: normalizeString(item, '暂未识别到明确风险')
          };
        })
      : [],
    actions: actionSource
      .map(item => {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            return {
              action: normalizeString(record.action, '明天继续补充关键时间记录'),
              why: normalizeString(record.why),
              scope: record.scope === 'tomorrow' || record.scope === 'next_week' ? record.scope : 'tomorrow'
            };
          }
          return {
            action: normalizeString(item, '明天继续补充关键时间记录')
          };
        }),
    caveats: limitationSource.map(item => normalizeString(item)).filter(Boolean)
  };
};

const hasDisplayableReview = (review: RemoteReview) => Boolean(
  review.summary ||
  review.time_distribution?.length ||
  review.insights?.length ||
  review.risks?.length ||
  review.actions?.length ||
  review.caveats?.length
);

const AIDailyReviewModal: React.FC<AIDailyReviewModalProps> = ({ isOpen, onClose, panelTitle, events, comparisonEvents, referenceDate, tags }) => {
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [remoteReview, setRemoteReview] = useState<RemoteReview | null>(null);
  const [provider, setProvider] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const review = useMemo(() => {
    const sortedEvents = [...events].sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    const totalMinutes = sortedEvents.reduce((sum, event) => sum + getDurationInMinutes(event.startTime, event.endTime), 0);
    const tagTotals = sortedEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + getDurationInMinutes(event.startTime, event.endTime);
      return acc;
    }, {});
    const previousDate = new Date(referenceDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousTagTotals = comparisonEvents.reduce<Record<string, number>>((acc, event) => {
      if (
        event.date.getFullYear() === previousDate.getFullYear() &&
        event.date.getMonth() === previousDate.getMonth() &&
        event.date.getDate() === previousDate.getDate()
      ) {
        acc[event.category] = (acc[event.category] || 0) + getDurationInMinutes(event.startTime, event.endTime);
      }
      return acc;
    }, {});

    const distribution = Object.entries(tagTotals)
      .map(([tagId, minutes]) => {
        const tag = tags.find(item => item.id === tagId);
        const previousMinutes = previousTagTotals[tagId] || 0;
        return {
          label: tag?.label || '未分类',
          color: tag?.color || 'bg-gray-400',
          minutes,
          ratio: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
          changePercent: previousMinutes > 0 ? Math.round(((minutes - previousMinutes) / previousMinutes) * 100) : null
        };
      })
      .sort((a, b) => b.minutes - a.minutes);

    const topTag = distribution[0];
    const shortEvents = sortedEvents.filter(event => getDurationInMinutes(event.startTime, event.endTime) <= 30);
    const eveningEvents = sortedEvents.filter(event => Number(event.startTime.split(':')[0]) >= 21);

    return {
      totalMinutes,
      tagCount: distribution.length,
      distribution,
      summary: topTag
        ? `这段时间主要集中在「${topTag.label}」，整体记录方向比较清晰。AI 会基于已记录事项给出复盘，不代表未记录的全天真实行为。`
        : '当前还没有足够的时间记录生成可靠复盘。',
      observations: [
        topTag
          ? {
              title: `${topTag.label} 是主要投入方向`,
              evidence: `${topTag.label} 共记录 ${formatDurationFromMinutes(topTag.minutes)}，占已记录时间 ${topTag.ratio}%。`
            }
          : null,
        sortedEvents.length >= 2
          ? {
              title: '今天已经形成可复盘的时间块',
              evidence: `系统识别到 ${sortedEvents.length} 条记录，总记录 ${formatDurationFromMinutes(totalMinutes)}。`
            }
          : null,
        shortEvents.length >= 2
          ? {
              title: '存在一定碎片化记录',
              evidence: `有 ${shortEvents.length} 条记录不超过 30 分钟，适合确认是否为临时切换或补记。`
            }
          : null
      ].filter(Boolean) as Array<{ title: string; evidence: string }>,
      risk: eveningEvents.length > 0
        ? '晚间仍有任务记录。当前只能说明晚间存在已记录事项，不能直接判断恢复不足。'
        : '当前未看到明显晚间任务风险。若休息没有被记录，复盘仍可能低估恢复时间。',
      actions: [
        topTag ? `明天优先保留一段连续时间给「${topTag.label}」，延续今天的主要投入方向。` : '先补充 2 条以上主要时间记录，再生成更可靠的复盘。',
        '补充记录休息或恢复时间，避免复盘只看到任务投入。'
      ]
    };
  }, [events, comparisonEvents, referenceDate, tags]);

  const hasEnoughData = events.length >= 2 && review.totalMinutes >= 30;
  const llmReview = status === 'success' ? remoteReview : null;
  const distribution = llmReview?.time_distribution?.length
    ? llmReview.time_distribution.map(item => {
        const localMatch = review.distribution.find(local => local.label === item.label);
        return {
          label: item.label,
          color: localMatch?.color || 'bg-gray-400',
          minutes: item.duration_minutes,
          ratio: typeof item.ratio === 'number' ? Math.round(item.ratio <= 1 ? item.ratio * 100 : item.ratio) : 0,
          observation: item.observation,
          changePercent: localMatch?.changePercent ?? null
        };
      })
    : review.distribution;

  const requestReview = async () => {
    if (!hasEnoughData) return;

    setStatus('loading');
    setRemoteReview(null);
    setProvider('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/ai/daily-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_range: {
            label: panelTitle,
            type: 'current_panel'
          },
          events: events.map(event => {
            const tag = tags.find(item => item.id === event.category);
            return {
              title: event.title,
              date: formatChinaDateKey(event.date),
              start_time: event.startTime,
              end_time: event.endTime,
              duration_minutes: getDurationInMinutes(event.startTime, event.endTime),
              tag: {
                id: event.category,
                label: tag?.label || '未分类'
              }
            };
          }),
          stats: {
            total_duration_minutes: review.totalMinutes,
            event_count: events.length,
            duration_by_tag: review.distribution.map(item => ({
              tag_label: item.label,
              duration_minutes: item.minutes,
              ratio: item.ratio / 100
            }))
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'AI 日复盘生成失败');
      }

      const normalizedReview = normalizeRemoteReview(data.review);
      if (!hasDisplayableReview(normalizedReview)) {
        throw new Error('AI 返回内容为空或格式不完整');
      }

      setRemoteReview(normalizedReview);
      setProvider(data.provider || '');
      setStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'AI 日复盘生成失败');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setFeedback(null);
    setRemoteReview(null);
    setProvider('');
    setErrorMessage('');
    setStatus('idle');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-[560px] justify-center animate-[modalEnter_0.3s_ease-out]">
      <GlassCard intensity="high" className="w-full max-h-[85vh] relative overflow-hidden !rounded-2xl bg-white/95 shadow-2xl border border-gray-200/80 flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Icons.Sparkles size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-black tracking-tight">AI 日复盘</h2>
                <p className="mt-0.5 text-xs font-medium text-gray-400">{panelTitle}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭 AI 日复盘"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-5 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">记录</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{events.length} 条</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">标签</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{review.tagCount} 个</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">总时长</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{formatDurationFromMinutes(review.totalMinutes)}</div>
            </div>
          </div>

          {!hasEnoughData ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
              <h3 className="text-sm font-semibold text-amber-900">今天的记录还不够生成可靠复盘</h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">建议至少补充 2 条主要学习、工作或休息记录，再生成 AI 日复盘。</p>
            </div>
          ) : (
            <>
              {status === 'error' && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-amber-900">真实 AI 调用暂时不可用，已展示本地 Demo 复盘</h3>
                  <p className="mt-1 text-xs leading-5 text-amber-800">{errorMessage}</p>
                </div>
              )}

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">今日概览</h3>
                <p className="mt-2 text-sm leading-6 text-gray-800">{llmReview?.summary || review.summary}</p>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">时间分布</h3>
                <div className="mt-3 space-y-3">
                  {distribution.map(item => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span className="truncate font-medium text-gray-800">{item.label}</span>
                          {typeof item.changePercent === 'number' && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${item.changePercent >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                              {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                            </span>
                          )}
                        </div>
                        <span className="flex-shrink-0 font-mono text-xs text-gray-500">{formatDurationFromMinutes(item.minutes)} · {item.ratio}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(item.ratio, 4)}%` }} />
                      </div>
                      {'observation' in item && item.observation && (
                        <p className="text-xs leading-5 text-gray-500">{item.observation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">关键观察</h3>
                <div className="mt-3 space-y-2">
                  {(llmReview?.insights?.length ? llmReview.insights : review.observations).slice(0, 3).map(item => (
                    <div key={item.title} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                      <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                      {'detail' in item && item.detail && <div className="mt-1 text-xs leading-5 text-gray-600">{item.detail}</div>}
                      <div className="mt-1 text-xs leading-5 text-gray-500">依据：{item.evidence || '基于当前时间记录与标签统计。'}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">风险提醒</h3>
                <p className="mt-2 text-sm leading-6 text-blue-900">
                  {llmReview?.risks?.[0]
                    ? `${llmReview.risks[0].risk}${llmReview.risks[0].reason ? `。${llmReview.risks[0].reason}` : ''}`
                    : review.risk}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">明日建议</h3>
                <div className="mt-3 space-y-2">
                  {(llmReview?.actions?.length ? llmReview.actions.map(item => item.why ? `${item.action}：${item.why}` : item.action) : review.actions).map(action => (
                    <div key={action} className="flex gap-2 text-sm leading-6 text-gray-800">
                      <Icons.Check size={16} className="mt-1 flex-shrink-0 text-green-500" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </section>

              {llmReview?.caveats && llmReview.caveats.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">数据限制</h3>
                  <div className="mt-2 space-y-1">
                    {llmReview.caveats.map(caveat => (
                      <p key={caveat} className="text-xs leading-5 text-gray-500">{caveat}</p>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-4">
          {feedback ? (
            <div className="text-sm font-medium text-gray-600">已记录反馈：{feedbackCopy[feedback]}。这会用于优化下一版复盘。</div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-gray-400">反馈</span>
              {(Object.keys(feedbackCopy) as FeedbackType[]).map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFeedback(type)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  {feedbackCopy[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
      </div>
    </div>
  );
};

export default AIDailyReviewModal;
