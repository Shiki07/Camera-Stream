
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  if (!user) return null;

  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Camera Stream</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <Button 
              variant="secondary" 
              size="sm" 
              asChild
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <a 
                href="https://github.com/Shiki07/Camera-Stream" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground border-border hover:bg-secondary text-xs sm:text-sm px-2 sm:px-3"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
