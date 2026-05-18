import { 
  LayoutDashboard, 
  FlaskConical, 
  Database, 
  Settings, 
  LifeBuoy, 
  History,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  onNewExperiment: () => void;
}

export default function Sidebar({ activePage, onPageChange, onNewExperiment }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'active-runs', label: 'Active Runs', icon: FlaskConical },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const bottomItems = [
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'logs', label: 'Logs', icon: History },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant p-4">
      <div className="mb-10 px-2">
        <h1 className="headline-md text-primary tracking-normal">PV Screener</h1>
        <p className="body-sm text-on-surface-variant">Literature Safety Review</p>
      </div>

      <button type="button" onClick={onNewExperiment} className="w-full mb-6 bg-primary text-on-primary label-md py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm">
        <PlusCircle className="w-4 h-4" />
        New Experiment
      </button>

      <ul className="flex-1 space-y-1.5">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg label-md transition-all ${
                activePage === item.id
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-1.5 pt-4 border-t border-outline-variant">
        {bottomItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg label-md transition-all ${
              activePage === item.id
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
