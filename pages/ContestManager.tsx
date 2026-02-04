import React, { useEffect, useMemo, useState } from 'react';
import { Contest, ContestCategory, ContestStatus, TARGET_OPTIONS } from '../types';
import { ContestRepository } from '../services/repository';
import { extractContestInfo } from '../services/aiExtract';

type Mode = 'create' | 'edit';

const emptyContest: Contest = {
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  applyUrl: '',
  category: ContestCategory.CAMPUS,
  status: ContestStatus.DRAFT,
  targets: [],
  startDate: '',
  endDate: '',
  createdAt: '',
  updatedAt: '',
  viewCount: 0,
};

export const ContestManager: React.FC = () => {
  /* ======================
   * STATE
   * ====================== */
  const [contests, setContests] = useState<Contest[]>([]);
  const [mode, setMode] = useState<Mode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Contest>({ ...emptyContest });
  const [step, setStep] = useState<1 | 2>(1);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isEditing = mode === 'edit' && Boolean(editingId);

  /* ======================
   * INIT: LOAD LIST
   * ====================== */
  useEffect(() => {
    (async () => {
      try {
        const list = await ContestRepository.getAll();
        setContests(list);
      } catch (e) {
        console.error(e);
        alert('공모전 목록 로딩 실패');
      }
    })();
  }, []);

  /* ======================
   * DERIVED
   * ====================== */
  const sorted = useMemo(() => {
    return [...contests].sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
    );
  }, [contests]);

  /* ======================
   * HELPERS
   * ====================== */
  const resetForm = () => {
    setMode('create');
    setEditingId(null);
    setForm({ ...emptyContest });
    setStep(1);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setAiLoading(false);
    setAiError(null);
  };

  const startEdit = (c: Contest) => {
    setMode('edit');
    setEditingId(c.id);
    setForm({ ...c });
    setStep(1);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setAiLoading(false);
    setAiError(null);
  };

  const onPickFile = (file: File | null) => {
    setUploadFile(file);
    setAiError(null);

    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    if (!file) {
      setUploadPreviewUrl(null);
      return;
    }
    setUploadPreviewUrl(URL.createObjectURL(file));
  };

  const toggleTarget = (t: string) => {
    setForm((prev) => {
      const has = prev.targets.includes(t);
      return {
        ...prev,
        targets: has ? prev.targets.filter((x) => x !== t) : [...prev.targets, t],
      };
    });
  };

  /* ======================
   * AI
   * ====================== */
  const runAi = async () => {
    if (!uploadFile) {
      setAiError('파일을 먼저 업로드하세요.');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const r = await extractContestInfo(uploadFile);

      const blocks: string[] = [];
      if (r.host) blocks.push(`**주최/주관**: ${r.host}`);
      if (r.targetSummary) blocks.push(`**대상**: ${r.targetSummary}`);
      if (r.applyStartDate || r.applyEndDate) {
        blocks.push(
          `**일정**: ${r.applyStartDate ?? ''} ~ ${r.applyEndDate ?? ''}`.trim()
        );
      }
      if (blocks.length) blocks.push('');

      const mergedDescription =
        (blocks.join('\n') + (r.description ?? '')).trim();

      setForm((prev) => ({
        ...prev,
        title: prev.title || r.summaryTitle || prev.title,
        description: mergedDescription || prev.description,
        startDate: r.applyStartDate ?? prev.startDate,
        endDate: r.applyEndDate ?? prev.endDate,
      }));

      setStep(2);
    } catch (e: any) {
      console.error(e);
      setAiError(e?.message ?? 'AI 처리 중 오류');
    } finally {
      setAiLoading(false);
    }
  };

  /* ======================
   * SAVE / DELETE
   * ====================== */
  const save = async () => {
    if (!form.title.trim()) return alert('공모전 제목은 필수입니다.');
    if (!form.applyUrl.trim()) return alert('신청 URL은 필수입니다.');

    try {
      const now = new Date().toISOString();

      const payload: Contest = {
        ...form,
        id: isEditing && editingId ? editingId : crypto.randomUUID(),
        createdAt: isEditing ? form.createdAt : now,
        updatedAt: now,
        viewCount: form.viewCount ?? 0,
      };

      await ContestRepository.save(payload);
      setContests(await ContestRepository.getAll());
      resetForm();
    } catch (e) {
      console.error(e);
      alert('저장 실패');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('삭제할까요?')) return;
    await ContestRepository.delete(id);
    setContests(await ContestRepository.getAll());
    if (editingId === id) resetForm();
  };

  /* ======================
   * RENDER
   * ====================== */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">공모전 게시 / 배포</h1>

      {/* ===== LIST ===== */}
      <div className="rounded-xl border bg-white p-4">
        {sorted.length === 0 && (
          <div className="text-sm text-gray-500">등록된 공모전이 없습니다.</div>
        )}
        {sorted.map((c) => (
          <div
            key={c.id}
            className="flex justify-between items-center border-b py-2"
          >
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-xs text-gray-500">
                {c.category} · {c.status}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(c)}>수정</button>
              <button onClick={() => remove(c.id)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
