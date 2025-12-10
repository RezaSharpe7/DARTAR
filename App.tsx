import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import { MessageSquare, LayoutDashboard, User, ScanLine, Menu } from 'lucide-react';

type View = 'chat' | 'dashboard' | 'profile';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col shadow-2xl overflow-hidden relative">
      
      {/* Top Header - changes based on view */}
      <div className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center space-x-3">
           <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center border-2 border-green-600">
              <span className="font-bold text-xs">D</span>
           </div>
           <div>
             <h1 className="font-bold text-lg leading-tight">DARTA</h1>
             {currentView === 'chat' && (
               <p className="text-[10px] text-green-100 opacity-90">Online • Data Assistant</p>
             )}
           </div>
        </div>
        <div className="flex space-x-4">
           {currentView === 'chat' && <ScanLine size={20} className="opacity-80" />}
           <Menu size={20} className="opacity-80" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'chat' && <ChatInterface />}
        {currentView === 'dashboard' && <div className="h-full overflow-y-auto"><Dashboard /></div>}
        {currentView === 'profile' && (
           <div className="p-8 text-center text-gray-500 mt-20">
             <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
               <User size={40} />
             </div>
             <h2 className="text-xl font-bold text-gray-800">Mama Kisaasi Shop</h2>
             <p>Owner Profile</p>
             <p className="mt-4 text-sm bg-yellow-100 p-2 rounded text-yellow-800">
               Profile settings coming soon.
             </p>
           </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 flex justify-around items-center h-16 pb-1">
        <button 
          onClick={() => setCurrentView('chat')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'chat' ? 'text-green-600' : 'text-gray-400'}`}
        >
          <MessageSquare size={22} fill={currentView === 'chat' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-medium">Chat</span>
        </button>

        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'dashboard' ? 'text-green-600' : 'text-gray-400'}`}
        >
          <LayoutDashboard size={22} />
          <span className="text-[10px] font-medium">App</span>
        </button>

        <button 
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'profile' ? 'text-green-600' : 'text-gray-400'}`}
        >
          <User size={22} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
