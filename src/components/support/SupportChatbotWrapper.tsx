'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SupportChatbot } from './SupportChatbot';
import { getProfileClient } from '@/lib/network';

export function SupportChatbotWrapper() {
  const pathname = usePathname();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  // Don't show chatbot on auth pages
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/login' || pathname === '/register';

  useEffect(() => {
    // Don't fetch profile on auth pages
    if (isAuthPage) {
      return;
    }

    // Fetch student profile to get student ID, name, and email
    const fetchStudentInfo = async () => {
      try {
        const profile = await getProfileClient();
        const student = profile?.data || profile;
        if (student?.id || student?.studentId) {
          setStudentId(student.id || student.studentId);
        }
        
        // Try to get name from profile
        const nameFromProfile = student?.fullName || student?.name || student?.fullname;
        if (nameFromProfile) {
          setUserName(nameFromProfile);
        }
        
        if (student?.email) {
          setUserEmail(student.email);
        }
        
        // Fallback: try to get name and email from user-info API
        try {
          const userInfoResponse = await fetch('/api/auth/user-info', {
            credentials: 'include',
          });
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            const user = userInfo?.user || userInfo?.decodedToken;
            
            // Get name from user-info if not already set
            if (!nameFromProfile && user) {
              const nameFromUserInfo = user?.fullName || 
                                     user?.name || 
                                     (user?.firstname && user?.lastname ? `${user.firstname} ${user.lastname}`.trim() : null) ||
                                     user?.firstname ||
                                     user?.lastname;
              if (nameFromUserInfo) {
                setUserName(nameFromUserInfo);
              }
            }
            
            // Get email from user-info if not already set
            if (!student?.email && user?.email) {
              setUserEmail(user.email);
            }
          }
        } catch (userInfoError) {
          console.debug('Could not fetch user-info:', userInfoError);
        }
      } catch (error) {
        // Silently fail - studentId is optional, backend can extract from token
        console.debug('Could not fetch student info for chatbot:', error);
        // Still try to get email from user-info API as fallback
        try {
          const userInfoResponse = await fetch('/api/auth/user-info', {
            credentials: 'include',
          });
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            if (userInfo?.user?.email) {
              setUserEmail(userInfo.user.email);
            }
          }
        } catch (userInfoError) {
          console.debug('Could not fetch email from user-info:', userInfoError);
        }
      }
    };

    fetchStudentInfo();
  }, [isAuthPage]);

  // Don't render chatbot on auth pages
  if (isAuthPage) {
    return null;
  }

  return <SupportChatbot studentId={studentId} userName={userName} userEmail={userEmail} />;
}
