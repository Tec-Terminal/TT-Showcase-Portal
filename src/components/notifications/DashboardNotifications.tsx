'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationsModal from './NotificationsModal';
import { Notification } from '@/types/student-portal.types';
import { markNotificationAsReadClient } from '@/lib/network';

interface DashboardNotificationsProps {
  notifications: Notification[];
}

function formatNotificationDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
}

export default function DashboardNotifications({
  notifications,
}: DashboardNotificationsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [localNotifications, setLocalNotifications] = useState(notifications);

  // Sync local state with prop when notifications change
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);
  
  // Show only the last 2 notifications
  const displayedNotifications = localNotifications.slice(0, 2);
  const hasMore = localNotifications.length > 2;

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsReadClient,
    onSuccess: (_, notificationId) => {
      // Update local state
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          {hasMore && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All
            </button>
          )}
        </div>
        <div className="space-y-4">
          {displayedNotifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No notifications
            </div>
          ) : (
            displayedNotifications.map((note) => (
              <div
                key={note.id}
                onClick={() => !note.read && handleMarkAsRead(note.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  !note.read
                    ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'
                    : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-gray-800">
                      {note.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1 leading-normal">
                      {note.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-3 text-right">
                      {formatNotificationDate(note.createdAt || note.sentAt)}
                    </p>
                  </div>
                  {!note.read && (
                    <span className="h-2 w-2 bg-blue-600 rounded-full mt-1 ml-2 shrink-0"></span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NotificationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

