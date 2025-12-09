
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
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-foreground">CamAlert Control Panel</h1>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-amber-600/20 border border-amber-600/30 rounded-md">
                <span className="text-amber-200 text-sm font-medium">🚧 Under Construction</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            asChild
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="text-muted-foreground border-border hover:bg-secondary"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
