import React, { useEffect, useState } from 'react';
import { ContestRepository } from '../services/repository';
import { Contest } from '../types';

export const CalendarView: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);

  useEffect(() => {
    ContestRepository.getAll().then(setContests);
  }, []);

  // Simple list view sorted by End Date for MVP
  const sortedContests = [...contests].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">마감 일정 캘린더</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
           {sortedContests.map(contest => {
             const daysLeft = Math.ceil((new Date(contest.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
             const isUrgent = daysLeft >= 0 && daysLeft <= 3;
             const isExpired = daysLeft < 0;

             return (
               <div key={contest.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-16 h-16 flex-shrink-0 flex flex-col items-center justify-center rounded-lg ${isUrgent ? 'bg-red-100 text-red-700' : isExpired ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>
                    <span className="text-xs font-bold">D-{daysLeft < 0 ? 'Day' : daysLeft}</span>
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="font-bold text-gray-900">{contest.title}</h4>
                    <p className="text-sm text-gray-500">{new Date(contest.endDate).toLocaleDateString()} 마감</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    {contest.category}
                  </span>
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
};