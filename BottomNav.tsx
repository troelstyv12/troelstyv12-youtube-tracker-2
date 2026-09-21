import React from 'react';
import { Compass, Heart, TrendingUp, BarChart3 } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  favoritesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  favoritesCount,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Hovednavigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-around">
        {/* Knap 1: Startsiden / Søg */}
        <button
          id="nav-btn-search"
          onClick={() => onTabChange('search')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all relative group cursor-pointer ${
            currentTab === 'search'
              ? 'text-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1">
            <Compass
              className={`w-5 h-5 transition-transform duration-200 ${
                currentTab === 'search' ? 'scale-110 stroke-[2.5]' : 'stroke-2'
              }`}
            />
            {currentTab === 'search' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Søg
          </span>
        </button>

        {/* Knap 2: Favoritter */}
        <button
          id="nav-btn-favorites"
          onClick={() => onTabChange('favorites')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all relative group cursor-pointer ${
            currentTab === 'favorites'
              ? 'text-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1">
            <Heart
              className={`w-5 h-5 transition-transform duration-200 ${
                currentTab === 'favorites' ? 'scale-110 fill-rose-500 stroke-rose-500' : 'stroke-2'
              }`}
            />
            {favoritesCount !== undefined && favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 min-w-[16px] h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
                {favoritesCount}
              </span>
            )}
            {currentTab === 'favorites' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Favoritter
          </span>
        </button>

        {/* Knap 3: Grafer (Daglige visninger for favoritter) */}
        <button
          id="nav-btn-graphs"
          onClick={() => onTabChange('graphs')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all relative group cursor-pointer ${
            currentTab === 'graphs'
              ? 'text-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1">
            <TrendingUp
              className={`w-5 h-5 transition-transform duration-200 ${
                currentTab === 'graphs' ? 'scale-110 stroke-[2.5]' : 'stroke-2'
              }`}
            />
            {currentTab === 'graphs' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Grafer
          </span>
        </button>

        {/* Knap 4: "Alle" / Samlet statistik */}
        <button
          id="nav-btn-stats"
          onClick={() => onTabChange('stats')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all relative group cursor-pointer ${
            currentTab === 'stats'
              ? 'text-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative p-1">
            <BarChart3
              className={`w-5 h-5 transition-transform duration-200 ${
                currentTab === 'stats' ? 'scale-110 stroke-[2.5]' : 'stroke-2'
              }`}
            />
            {currentTab === 'stats' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Statistik
          </span>
        </button>
      </div>
    </nav>
  );
};
