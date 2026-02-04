import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

type SidebarItem = {
    id: string;
    path: string;
    icon: React.ReactNode;
    label: string;
};

const items: SidebarItem[] = [
    {
        id: 'trade',
        path: '/',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
        label: 'Trade'
    },
    {
        id: 'history',
        path: '/history',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        label: 'History'
    },
    {
        id: 'settings',
        path: '/settings',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        label: 'Settings'
    },
];

type Props = {
    onSignOut?: () => void;
};

export default function Sidebar({ onSignOut }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleClick = (path: string) => {
        navigate(path);
    };

    const handleSignOut = async () => {
        try {
            await api.logout();
        } catch (e) {
            console.error('Logout failed:', e);
        }
        onSignOut?.();
        window.location.href = '/';
    };

    const isActive = (path: string) => {
        if (path === '/trade') {
            return location.pathname === '/' || location.pathname === '/trade';
        }
        return location.pathname === path;
    };

    return (
        <div className="w-[60px] h-full bg-[#0d0f13] border-r border-[#2a2e39] flex flex-col items-center py-4">
            {/* Logo */}
            <div
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-6 cursor-pointer"
                onClick={() => navigate('/trade')}
            >
                <span className="text-black font-bold text-lg">E</span>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 flex flex-col gap-2">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleClick(item.path)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${isActive(item.path)
                            ? 'bg-[#2a2e39] text-white'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1d24]'
                            }`}
                        title={item.label}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>

            {/* Sign Out Button */}
            <div className="mt-auto">
                <button
                    onClick={handleSignOut}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-[#1a1d24] transition-colors"
                    title="Sign Out"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

