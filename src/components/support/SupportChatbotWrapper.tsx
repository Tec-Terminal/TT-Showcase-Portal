'use client';

import { useState, useEffect } from 'react';
import { SupportChatbot } from './SupportChatbot';
import { getProfileClient } from '@/lib/network';

export function SupportChatbotWrapper() {
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Fetch student profile to get student ID and name
    const fetchStudentInfo = async () => {
      try {
        const profile = await getProfileClient();
        const student = profile?.data || profile;
        if (student?.id || student?.studentId) {
          setStudentId(student.id || student.studentId);
        }
        if (student?.fullName) {
          setUserName(student.fullName);
        }
      } catch (error) {
        // Silently fail - studentId is optional, backend can extract from token
        console.debug('Could not fetch student info for chatbot:', error);
      }
    };

    fetchStudentInfo();
  }, []);

  return <SupportChatbot studentId={studentId} userName={userName} />;
}

