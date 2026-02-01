import React, { useEffect, useState } from 'react';
import { ContestRepository } from '../services/repository';
import { Contest, ContestCategory, ContestStatus, TargetCollege } from '../types';
import { CONTEST_CATEGORIES, TARGET_COLLEGES, DEFAULT_IMAGE_PLACEHOLDER } from '../constants';
import { Plus, Edit, Trash2, Search, Filter, X, Check } from 'lucide-react';

export const ContestManager: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    const data = await ContestRepository.getAll();
    setContests(data);
  };

  const handleCreate = () => {
    setEditingId(null);
    setView('form');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await ContestRepository.delete(id);
      loadContests();
    }
  };

  const handleSave = async (contest: Contest) => {
    await ContestRepository.save(contest);
    await loadContests();
    setView('list');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">공모전 관리</h2>
        {view === 'list' && (
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            새 공모전 등록
          </button>
        )}
      </div>

      {view === 'list' ? (
        <ContestList contests={contests} onEdit={handleEdit} onDelete={handleDelete} />
      ) : (
        <ContestForm 
          initialData={contests.find(c => c.id === editingId)} 
          onSave={handleSave} 
          onCancel={() => setView('list')} 
        />
      )}
    </div>
  );
};

// --- Sub-components ---

const ContestList: React.FC<{
  contests: Contest[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ contests, onEdit, onDelete }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <table className="w-full text-left text-sm text-gray-600">
      <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
        <tr>
          <th className="px-6 py-4">제목</th>
          <th className="px-6 py-4">카테고리</th>
          <th className="px-6 py-4">상태</th>
          <th className="px-6 py-4">대상</th>
          <th className="px-6 py-4">마감일</th>
          <th className="px-6 py-4 text-right">작업</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {contests.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-gray-400">등록된 공모전이 없습니다.</td>
          </tr>
        ) : contests.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 font-medium text-gray-900">{c.title}</td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">{c.category}</span>
            </td>
            <td className="px-6 py-4">
               <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                 c.status === ContestStatus.PUBLISHED ? 'bg-green-100 text-green-700' :
                 c.status === ContestStatus.DRAFT ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
               }`}>
                 {c.status}
               </span>
            </td>
            <td className="px-6 py-4 truncate max-w-xs" title={c.targets.join(', ')}>
              {c.targets.length > 2 ? `${c.targets[0]} 외 ${c.targets.length - 1}` : c.targets.join(', ')}
            </td>
            <td className="px-6 py-4">{new Date(c.endDate).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-right space-x-2">
              <button onClick={() => onEdit(c.id)} className="text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
              <button onClick={() => onDelete(c.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ContestForm: React.FC<{
  initialData?: Contest;
  onSave: (contest: Contest) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Contest>>(initialData || {
    title: '',
    description: '',
    imageUrl: DEFAULT_IMAGE_PLACEHOLDER,
    applyUrl: '',
    category: ContestCategory.CAMPUS,
    status: ContestStatus.DRAFT,
    targets: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  const handleChange = (field: keyof Contest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTargetToggle = (target: TargetCollege) => {
    const current = formData.targets || [];
    const updated = current.includes(target) 
      ? current.filter(t => t !== target)
      : [...current, target];
    handleChange('targets', updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.applyUrl || (formData.targets?.length || 0) === 0) {
      alert('제목, 신청 URL, 그리고 대상(최소 1개)은 필수입니다.');
      return;
    }
    // Type casting here safe because we validate fields
    onSave(formData as Contest);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold mb-6 border-b pb-2">{initialData ? '공모전 수정' : '새 공모전 등록'}</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공모전 제목 *</label>
            <input 
              type="text" 
              required
              value={formData.title} 
              onChange={e => handleChange('title', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">신청 URL (Deep Link) *</label>
            <input 
              type="url" 
              required
              value={formData.applyUrl} 
              onChange={e => handleChange('applyUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select 
              value={formData.category} 
              onChange={e => handleChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              {CONTEST_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">게시 상태</label>
            <select 
              value={formData.status} 
              onChange={e => handleChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.values(ContestStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">게시 대상 (복수 선택 가능) *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TARGET_COLLEGES.map(college => (
              <label key={college} className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100">
                <input 
                  type="checkbox" 
                  checked={formData.targets?.includes(college)}
                  onChange={() => handleTargetToggle(college)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{college}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상세 내용</label>
          <textarea 
            rows={5}
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
             <input type="date" value={formData.startDate?.toString().split('T')[0]} onChange={e => handleChange('startDate', e.target.value)} className="w-full border p-2 rounded" />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
             <input type="date" value={formData.endDate?.toString().split('T')[0]} onChange={e => handleChange('endDate', e.target.value)} className="w-full border p-2 rounded" />
           </div>
        </div>
        
        <div className="pt-4 flex justify-end gap-3 border-t">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button 
            type="submit"
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            저장 및 게시
          </button>
        </div>
      </form>
    </div>
  );
};