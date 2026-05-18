import { Bell, User } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function Header({ currentTab, onTabChange }: HeaderProps) {
  const tabs = [
    { id: 'search', label: 'New Search' },
    { id: 'review', label: 'Review Queue' },
    { id: 'archives', label: 'Archives' },
  ];

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-10">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center w-full px-4 sm:px-6 py-3 max-w-[1440px] mx-auto">
        <div className="md:hidden">
          <h1 className="headline-md font-bold text-primary">PV Screener</h1>
        </div>
        
        <nav className="flex gap-2 sm:gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={currentTab === tab.id ? 'page' : undefined}
              className={`body-md whitespace-nowrap transition-all pb-2 px-1 relative ${
                currentTab === tab.id
                  ? 'text-primary font-medium'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab.label}
              {currentTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-on-surface-variant">
          <button type="button" aria-label="Notifications" title="Notifications" className="hover:text-primary transition-colors p-1.5 rounded-full hover:bg-surface-container">
            <Bell className="w-5 h-5" />
          </button>
          <button type="button" aria-label="Account" title="Account" className="hover:text-primary transition-colors p-1.5 rounded-full hover:bg-surface-container">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
