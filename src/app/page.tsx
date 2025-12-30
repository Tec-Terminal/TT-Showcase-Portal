import { redirect } from 'next/navigation';
import { isAuthenticated, checkStudentProfileStatus } from '@/lib/auth';

export default async function HomePage() {
  const authenticated = await isAuthenticated();
  
  if (authenticated) {
    // Check if user has a student profile
    const profileStatus = await checkStudentProfileStatus();
    if (profileStatus.hasStudentProfile) {
      redirect('/dashboard');
    } else {
      redirect('/onboarding');
    }
  } else {
    redirect('/auth/login');
  }
}
