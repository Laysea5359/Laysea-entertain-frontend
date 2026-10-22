import React from 'react';
import { UserSession } from '../types';

interface PhoneContainerProps {
  children: React.ReactNode;
  userSession: UserSession | null;
  onLogout?: () => void;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Pure Mobile Web App Container (No artificial phone bezel or frame, no demo switches) */}
      <div className="w-full max-w-md min-h-screen bg-slate-950 flex flex-col flex-1 shadow-2xl relative">
        {children}
      </div>
    </div>
  );
};
