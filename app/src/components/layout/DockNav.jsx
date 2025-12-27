import { useState } from 'react';

const DockNav = ({ navItems, activeTab, onSelectTab, className = '' }) => {
  const [hoveredDock, setHoveredDock] = useState(null);

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <div className="relative">
        <div
          className={`flex items-end justify-center gap-2 px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500 ease-out ${
            hoveredDock ? 'scale-[1.02]' : ''
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isHovered = hoveredDock === item.id;
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setHoveredDock(item.id)}
                onMouseLeave={() => setHoveredDock(null)}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`
                    relative flex items-center justify-center
                    w-11 h-11 rounded-lg
                    border transition-all duration-300 ease-out
                    ${isActive ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                    ${isHovered ? 'scale-110 -translate-y-1' : 'hover:scale-105 hover:-translate-y-0.5'}
                  `}
                >
                  <Icon
                    size={18}
                    weight={isActive ? 'fill' : 'regular'}
                    className={isActive ? 'text-emerald-300' : 'text-white'}
                  />
                  <span className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-transparent'}`} />
                </button>

                <div
                  className={`
                    absolute -top-9 left-1/2 -translate-x-1/2
                    px-2.5 py-1 rounded-md
                    bg-black/70 backdrop-blur
                    text-white text-xs font-normal
                    border border-white/5
                    transition-all duration-200
                    pointer-events-none
                    whitespace-nowrap
                    ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
                    shadow-sm
                  `}
                >
                  {item.label}
                  <div className="absolute top-full left-1/2 -translate-x-1/2">
                    <div className="w-2 h-2 bg-black/70 rotate-45 border-r border-b border-white/5"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block absolute top-full left-3 right-3 h-10 overflow-hidden pointer-events-none">
          <div
            className={`flex items-start justify-center gap-2 px-5 py-3 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/5 opacity-30 transform scale-y-[-1] transition-all duration-500 ease-out ${
              hoveredDock ? 'scale-[1.02] scale-y-[-1.02]' : ''
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isHovered = hoveredDock === item.id;
              return (
                <div
                  key={`dock-reflection-${item.id}`}
                  className={`flex items-center justify-center w-11 h-11 rounded-lg bg-white/5 transition-all duration-300 ease-out ${
                    isHovered ? 'scale-125 -translate-y-2' : ''
                  }`}
                >
                  <Icon size={18} className="text-white/50" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export { DockNav };
