
import React from 'react';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-white">RPi CamAlert Control Panel</h1>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-amber-600/20 border border-amber-600/30 rounded-md">
                <span className="text-amber-200 text-sm font-medium">🚧 Under Construction</span>
              </div>
              <div className="px-3 py-1 bg-red-600/20 border border-red-600/30 rounded-md">
                <span className="text-red-200 text-sm font-medium">⚠️ VPN Not Supported for Raspberry Pi</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This website is under construction to be able to connect multiple cameras, if you need to connect just one you can go to{' '}
              <a href="https://rpicamalert.xyz" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                rpicamalert.xyz
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="secondary" 
            size="sm" 
            asChild
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            <a 
              href="https://github.com/Shiki07/cam-alert" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
