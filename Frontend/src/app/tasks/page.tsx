'use client';

import React, { useRef, useState, useEffect } from 'react';
import TasksList, { TasksListRef } from '../../components/TasksList';
import { Activity, BarChart3, Clock, CheckCircle2, RefreshCw, List, Grid3X3, Search, Filter } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export default function TasksPage() {
  const tasksListRef = useRef<TasksListRef>(null);
  const [currentViewMode, setCurrentViewMode] = useState<'table' | 'cards'>('table');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Auto-switch to cards view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCurrentViewMode('cards');
        if (tasksListRef.current?.setViewMode) {
          tasksListRef.current.setViewMode('cards');
        }
      } else if (window.innerWidth >= 1024) {
        setCurrentViewMode('table');
        if (tasksListRef.current?.setViewMode) {
          tasksListRef.current.setViewMode('table');
        }
      }
    };

    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRefresh = () => {
    if (tasksListRef.current?.handleRefresh) {
      tasksListRef.current.handleRefresh();
    }
  };

  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setCurrentViewMode(mode);
    if (tasksListRef.current?.setViewMode) {
      tasksListRef.current.setViewMode(mode);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (tasksListRef.current?.setSearchText) {
      tasksListRef.current.setSearchText(text);
    }
  };

  const handleStatusFilterChange = (filter: string) => {
    setStatusFilter(filter);
    if (tasksListRef.current?.setStatusFilter) {
      tasksListRef.current.setStatusFilter(filter);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-blue-50/30 dark:from-background dark:via-background dark:to-background">
      {/* Enhanced Header */}
      <div className="border-b border-border bg-background/80 dark:bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Activity className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-purple-600 to-indigo-600 dark:from-white dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Task Management
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Monitor and manage your video generation tasks
                  </p>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center bg-muted rounded-lg p-1">
                  <Button
                    variant={currentViewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('table')}
                    className="h-8 px-3"
                    title="Table View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={currentViewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('cards')}
                    className="h-8 px-3"
                    title="Card View"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  className="flex items-center gap-2 border border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
            
            {/* Secondary controls row */}
            <div className="flex flex-col md:flex-row justify-between items-stretch gap-3 md:gap-4 pt-4 border-t border-border/50">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks by ID or prompt..."
                    value={searchText}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 bg-background/80 dark:bg-card/80 border-border"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium whitespace-nowrap">Status:</span>
                </div>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-full sm:w-40 bg-background/80 dark:bg-card/80 border-border">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-purple-400/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-40 left-20 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <TasksList 
          ref={tasksListRef}
          searchText={searchText}
          statusFilter={statusFilter}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
        />
      </div>
    </div>
  );
}
