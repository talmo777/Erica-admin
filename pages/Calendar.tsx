import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Contest } from '../types';
import ContestModal from '../components/ContestModal';
import { getContests } from '../services/api';
import { mapApiContestToContest } from '../services/contestMapper';

type AreaKey = '창업' | 'IT/SW' | '디자인' | '마케팅' | '공학' | '인문/사회' | '기타';

const AREAS: { key: AreaKey; label: string }[] = [
  { key: '창업', label: '창업' },
  { key: 'IT/SW', label: 'IT/SW' },
  { key: '디자인', label: '디자인' },
  { key: '마케팅', label: '마케팅' },
  { key: '공학', label: '공학' },
  { key: '인문/사회', label: '인문/사회' },
];

const RECENT_KEY = 'hy_link_recent_contests_v1';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function toDate(s?: string | null) {
  if (!s) return null;
  // YYYY-MM-DD → local date
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function diffDays(from: Date, to: Date) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.ceil((b - a) / 86400000);
}

// 대충이라도 분야 분류(지금은 키워드+category 기반. 데이터 정리되면 여기만 교체하면 됨)
function inferArea(c: Contest): AreaKey {
  const blob = `${c.category ?? ''} ${c.title ?? ''} ${c.description ?? ''}`.toLowerCase();

  if (blob.includes('창업') || blob.includes('스타트업') || blob.includes('벤처')) return '창업';
  if (blob.includes('sw') || blob.includes('it') || blob.includes('소프트') || blob.includes('개발') || blob.includes('ai') || blob.includes('데이터'))
    return 'IT/SW';
  if (blob.includes('디자인') || blob.includes('영상') || blob.includes('포스터') || blob.includes('브랜딩')) return '디자인';
  if (blob.includes('마케팅') || blob.includes('홍보') || blob.includes('콘텐츠')) return '마케팅';
  if (blob.includes('공학') || blob.includes('캡스톤') || blob.includes('로봇') || blob.includes('기계') || blob.includes('전기')) return '공학';
  if (blob.includes('인문') || blob.includes('사회') || blob.includes('문화') || blob.includes('경영') || blob.includes('상경')) return '인문/사회';

  return '기타';
}

// 상태(색 구분용)
function getStatus(today: Date, c: Contest) {
  const s = toDate(c.startDate);
  const e = toDate(c.endDate);
  const t = startOfDay(today);

  // 우선순위: 오늘이 시작/마감이면 그걸로 표시
  if (s && isSameDay(t, s)) {
    return { label: '신청 시작', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  }
  if (e && isSameDay(t, e)) {
    return { label: '신청 마감', cls: 'bg-rose-50 text-rose-700 ring-rose-200' };
  }

  // 기간형이면 접수중
  if (s && e && t.getTime() >= s.getTime() && t.getTime() <= e.getTime()) {
    return { label: '접수 중', cls: 'bg-sky-50 text-sky-700 ring-sky-200' };
  }

  // 시작일만 있으면 시작 전/후 판단 (후는 의미 없으니 접수중으로 묶거나 생략 가능)
  if (s && !e) {
    if (t.getTime() < s.getTime()) return { label: '신청 시작', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
    return { label: '접수 중', cls: 'bg-sky-50 text-sky-700 ring-sky-200' };
  }

  // 마감일만 있으면 마감 임박/접수중
  if (!s && e) {
    if (t.getTime() <= e.getTime()) return { label: '신청 마감', cls: 'bg-amber-50 text-amber-800 ring-amber-200' };
    return { label: '마감', cls: 'bg-slate-100 text-slate-600 ring-slate-200' };
  }

  return { label: '기타', cls: 'bg-slate-100 text-slate-600 ring-slate-200' };
}

function loadRecent(): Contest[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as Contest[];
  } catch {
    return [];
  }
}

function pushRecent(item: Contest) {
  try {
    const cur = loadRecent();
    const next = [item, ...cur.filter((x) => x.id !== item.id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const Calendar: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedAreas, setSelectedAreas] = useState<Record<AreaKey, boolean>>(() => {
    const base: Record<AreaKey, boolean> = {
      창업: true,
      'IT/SW': true,
      디자인: true,
      마케팅: true,
      공학: true,
      '인문/사회': true,
      기타: true,
    };
    return base;
  });

  const [recent, setRecent] = useState<Contest[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    (async () => {
      const apiContests = await getContests();
      setContests(apiContests.map(mapApiContestToContest));
    })();
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const monthStart = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const monthEnd = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

  const startDay = useMemo(() => monthStart.getDay(), [monthStart]);
  const daysInMonth = useMemo(() => monthEnd.getDate(), [monthEnd]);

  const filteredContests = useMemo(() => {
    return contests.filter((c) => selectedAreas[inferArea(c)]);
  }, [contests, selectedAreas]);

  // 마감 임박(0~30일)
  const upcomingDeadlines = useMemo(() => {
    const base = filteredContests
      .map((c) => {
        const e = toDate(c.endDate);
        if (!e) return null;
        const d = diffDays(today, e);
        if (d < 0 || d > 30) return null;
        return { c, d, area: inferArea(c) };
      })
      .filter(Boolean) as { c: Contest; d: number; area: AreaKey }[];

    base.sort((a, b) => a.d - b.d);
    return base.slice(0, 8);
  }, [filteredContests, today]);

  const monthLabel = useMemo(() => {
    return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  }, [currentDate]);

  const toggleArea = (k: AreaKey) => {
    setSelectedAreas((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const openContest = (c: Contest) => {
    setSelectedContest(c);
    pushRecent(c);
    setRecent(loadRecent());
  };

  // 특정 날짜에 표시할 칩들(시작/마감만 찍음 + 오늘이면 접수중 추가 표시)
  const chipsForDate = (date: Date) => {
    const out: { key: string; label: string; cls: string; contest: Contest }[] = [];
    for (const c of filteredContests) {
      const s = toDate(c.startDate);
      const e = toDate(c.endDate);

      if (s && isSameDay(date, s)) {
        out.push({
          key: `${c.id}-start`,
          label: '신청 시작',
          cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
          contest: c,
        });
      }
      if (e && isSameDay(date, e)) {
        out.push({
          key: `${c.id}-end`,
          label: '신청 마감',
          cls: 'bg-rose-50 text-rose-700 ring-rose-200',
          contest: c,
        });
      }

      // 오늘 칸에 “접수중”도 보여주고 싶으면(너무 많아질 수 있어서 오늘만)
      if (isSameDay(date, today)) {
        const st = getStatus(today, c);
        if (st.label === '접수 중') {
          out.push({
            key: `${c.id}-ing`,
            label: '접수 중',
            cls: 'bg-sky-50 text-sky-700 ring-sky-200',
            contest: c,
          });
        }
      }
    }

    // 너무 많으면 UI 터짐 → 상위 4개만
    return out.slice(0, 4);
  };

  const prevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">캘린더</h2>
        <p className="mt-1 text-sm text-slate-500">공모전 신청 시작·마감 일정을 한눈에 확인합니다.</p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* LEFT PANEL */}
        <aside className="space-y-4">
          {/* 관심 분야 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">관심 분야</div>
            <div className="space-y-2">
              {AREAS.map((a) => (
                <label key={a.key} className="flex items-center gap-3 text-sm text-slate-700 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={!!selectedAreas[a.key]}
                    onChange={() => toggleArea(a.key)}
                  />
                  {a.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
                onClick={() => {
                  const all: Record<AreaKey, boolean> = {
                    창업: true,
                    'IT/SW': true,
                    디자인: true,
                    마케팅: true,
                    공학: true,
                    '인문/사회': true,
                    기타: true,
                  };
                  setSelectedAreas(all);
                }}
              >
                전체 선택
              </button>
              <button
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
                onClick={() => {
                  const none: Record<AreaKey, boolean> = {
                    창업: false,
                    'IT/SW': false,
                    디자인: false,
                    마케팅: false,
                    공학: false,
                    '인문/사회': false,
                    기타: false,
                  };
                  setSelectedAreas(none);
                }}
              >
                전체 해제
              </button>
            </div>
          </div>

          {/* 마감 임박 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">오늘의 마감</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {today.getMonth() + 1}/{today.getDate()} 기준
                </span>
              </div>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="text-sm text-slate-400">30일 내 마감 공모전이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map(({ c, d, area }) => (
                  <button
                    key={c.id}
                    onClick={() => openContest(c)}
                    className="w-full text-left rounded-xl p-3 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-200">
                            D-{d}
                          </span>
                          <span className="text-xs text-slate-400">{area}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-800 line-clamp-2">{c.title}</div>
                      </div>

                      <span className={['shrink-0 text-xs px-2 py-0.5 rounded-full ring-1 ring-inset font-medium', getStatus(today, c).cls].join(' ')}>
                        {getStatus(today, c).label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 최근 본 공모전 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">최근 본 공모전</div>
            {recent.length === 0 ? (
              <div className="text-sm text-slate-400">아직 없음</div>
            ) : (
              <div className="space-y-1">
                {recent.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openContest(c)}
                    className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50 transition"
                  >
                    <div className="text-sm text-slate-700 line-clamp-1 font-medium">{c.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {c.endDate ? `마감: ${c.endDate}` : '마감일 없음'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: CALENDAR */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-bold text-slate-900">{monthLabel}</div>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition" aria-label="prev month">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition" aria-label="next month">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div
                key={day}
                className={[
                  'bg-slate-50 px-2 py-2.5 text-center text-xs font-semibold',
                  idx === 0 ? 'text-rose-500' : '',
                  idx === 6 ? 'text-sky-600' : '',
                  idx !== 0 && idx !== 6 ? 'text-slate-500' : '',
                ].join(' ')}
              >
                {day}
              </div>
            ))}

            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white p-2 h-28" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
              const isToday = isSameDay(date, today);
              const chips = chipsForDate(date);

              return (
                <div
                  key={i}
                  className={[
                    'bg-white p-2 h-28 relative',
                    isToday ? 'ring-2 ring-inset ring-sky-400' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-sky-500 text-white' : 'text-slate-600',
                      ].join(' ')}
                    >
                      {i + 1}
                    </span>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {chips.map((chip) => (
                      <button
                        key={chip.key}
                        onClick={() => openContest(chip.contest)}
                        className={['w-full text-left text-[10px] px-1.5 py-0.5 rounded ring-1 ring-inset font-medium', chip.cls].join(' ')}
                        title={chip.contest.title}
                      >
                        <div className="truncate">
                          [{chip.label}] {chip.contest.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>색상:</span>
            <span className="px-2 py-0.5 rounded ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200 font-medium">신청 시작</span>
            <span className="px-2 py-0.5 rounded ring-1 ring-inset bg-sky-50 text-sky-700 ring-sky-200 font-medium">접수 중</span>
            <span className="px-2 py-0.5 rounded ring-1 ring-inset bg-rose-50 text-rose-700 ring-rose-200 font-medium">신청 마감</span>
          </div>
        </section>
      </div>

      {selectedContest && (
        <ContestModal contest={selectedContest} isOpen={!!selectedContest} onClose={() => setSelectedContest(null)} />
      )}
    </div>
  );
};

export default Calendar;
