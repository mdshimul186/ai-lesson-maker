'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useAccountStore } from '../../stores';
import { useTheme } from '../../contexts/theme-provider';
import { 
  User, 
  LogOut, 
  Settings, 
  GraduationCap,
  Video,
  BookOpen,
  LayoutDashboard,
  CheckSquare,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import AccountSelector from '../AccountSelector';

// shadcn/ui components
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const AppHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { currentAccount } = useAccountStore();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigationItems = [
    {
      key: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard'
    },
    {
      key: '/lesson-maker',
      label: 'Lesson Maker',
      icon: Video,
      href: '/lesson-maker'
    },
    {
      key: '/courses',
      label: 'Course Maker',
      icon: BookOpen,
      href: '/courses'
    },
    {
      key: '/tasks',
      label: 'Tasks',
      icon: CheckSquare,
      href: '/tasks'
    }
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 dark:bg-background/95 backdrop-blur-lg border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
      {/* Main Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-xl">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link 
                href={isAuthenticated ? "/dashboard" : "/"} 
                className="flex items-center space-x-3 text-white hover:text-blue-100 dark:hover:text-gray-200 transition-all duration-300 group"
              >
                <div className="relative overflow-hidden bg-white/10 backdrop-blur-sm rounded-xl p-2 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border border-white/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <GraduationCap className="w-6 h-6 relative z-10" />
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    AI Lesson Maker
                  </span>
                  <div className="text-xs text-blue-100/80 font-medium -mt-1">
                    Create • Learn • Innovate
                  </div>
                </div>
              </Link>
            </div>

            {/* Public Navigation for non-authenticated users */}
            {!isAuthenticated && (
              <nav className="hidden md:flex items-center space-x-2">
                <Link href="/pricing">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-lg font-medium px-4 py-2"
                  >
                    Pricing
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-lg font-medium px-4 py-2"
                  >
                    Contact
                  </Button>
                </Link>
                <Link href="/terms-conditions">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-lg font-medium px-4 py-2"
                  >
                    Terms
                  </Button>
                </Link>
              </nav>
            )}

            {/* Authenticated Navigation */}
            {isAuthenticated && (
              <nav className="hidden lg:flex items-center space-x-2">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href === '/courses' && pathname.startsWith('/course'));
                  
                  return (
                    <Link key={item.key} href={item.href}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={`
                          relative flex items-center space-x-2 px-3 py-2 transition-all duration-300 rounded-lg font-medium
                          ${isActive 
                            ? 'bg-white/20 text-white font-semibold shadow-lg backdrop-blur-sm border border-white/30' 
                            : 'text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                          }
                        `}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg"></div>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* Current Account Badge */}
          

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="relative text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-full backdrop-blur-sm border border-white/20 shadow-lg group w-10 h-10"
                  aria-label="Toggle theme"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300"></div>
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 relative z-10" />
                  ) : (
                    <Moon className="h-4 w-4 relative z-10" />
                  )}
                </Button>

                {isAuthenticated && (
                  <>
                    <div className="hidden md:block">
                      <AccountSelector />
                    </div>
                    <Separator orientation="vertical" className="h-8 bg-white/30 mx-2" />
                  </>
                )}
              </div>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-white hover:bg-white/10 space-x-3 backdrop-blur-sm border border-white/20 shadow-lg rounded-full px-4 py-2.5 transition-all duration-300 group h-12">
                      <Avatar className="w-9 h-9 bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                          {user?.first_name || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden xl:flex flex-col items-start">
                        <span className="text-sm font-semibold leading-tight">
                          {user?.first_name || 'User'}
                        </span>
                        {currentAccount && (
                          <span className="text-xs text-white/80">
                            {currentAccount.credits} credits
                          </span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-background/95 backdrop-blur-lg border border-border/50 shadow-xl">
                    <div className="px-3 py-3 border-b border-border/50">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                            {user?.first_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user?.first_name || 'User'}</p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                      <User className="w-4 h-4 mr-3" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account')} className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                      <Settings className="w-4 h-4 mr-3" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 mr-3" />
                      ) : (
                        <Moon className="w-4 h-4 mr-3" />
                      )}
                      Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950 transition-colors py-3">
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login">
                    <Button variant="ghost" className="text-white hover:text-blue-100 hover:bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2.5 transition-all duration-300 font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-5 py-2.5 hover:scale-105">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isAuthenticated && (
        <div className="lg:hidden bg-background/95 dark:bg-background/95 backdrop-blur-lg border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-4 space-x-1">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.href || 
                  (item.href === '/courses' && pathname.startsWith('/course'));
                
                return (
                  <Link key={item.key} href={item.href} className="flex-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`
                        w-full flex flex-col items-center py-4 h-auto space-y-2 transition-all duration-300 rounded-xl relative
                        ${isActive 
                          ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 dark:text-blue-400 dark:from-blue-950 dark:to-purple-950 font-semibold shadow-lg border border-blue-200 dark:border-blue-800 scale-105' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105'
                        }
                      `}
                    >
                      <div className={`
                        p-2 rounded-lg transition-all duration-300
                        ${isActive 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md' 
                          : 'bg-muted/50'
                        }
                      `}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{item.label}</span>
                      {isActive && (
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile Account Info */}
            {currentAccount && (
              <div className="pb-3 border-t border-border/40 pt-3">
                <div className="flex items-center justify-center space-x-3 bg-muted/50 rounded-xl px-4 py-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">
                    {currentAccount.credits} credits available
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation for non-authenticated users */}
      {!isAuthenticated && (
        <div className="md:hidden bg-background/95 dark:bg-background/95 backdrop-blur-lg border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-4 space-x-1">
              <Link href="/pricing" className="flex-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full flex flex-col items-center py-4 h-auto space-y-2 transition-all duration-300 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105"
                >
                  <div className="p-2 rounded-lg bg-muted/50 transition-all duration-300">
                    <span className="text-lg">💰</span>
                  </div>
                  <span className="text-xs font-medium leading-tight">Pricing</span>
                </Button>
              </Link>
              <Link href="/contact" className="flex-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full flex flex-col items-center py-4 h-auto space-y-2 transition-all duration-300 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105"
                >
                  <div className="p-2 rounded-lg bg-muted/50 transition-all duration-300">
                    <span className="text-lg">📧</span>
                  </div>
                  <span className="text-xs font-medium leading-tight">Contact</span>
                </Button>
              </Link>
              <Link href="/terms-conditions" className="flex-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full flex flex-col items-center py-4 h-auto space-y-2 transition-all duration-300 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105"
                >
                  <div className="p-2 rounded-lg bg-muted/50 transition-all duration-300">
                    <span className="text-lg">📋</span>
                  </div>
                  <span className="text-xs font-medium leading-tight">Terms</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;

