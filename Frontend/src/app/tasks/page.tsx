'use client';

import React from 'react';
import TasksList from '../../components/TasksList';

export default function TasksPage() {
  return (
    <div className="w-screen">
      <div className="px-12 flex flex-col items-center">
        <TasksList />
      </div>
    </div>
  );
}
