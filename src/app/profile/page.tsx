import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';
import MainLayout from '@/components/layout/MainLayout';
import { StudentProfile } from '@/types/student-portal.types';
import ProfileForm from '@/components/profile/ProfileForm';
import { formatDate } from '@/lib/utils/errorHandler';

export default async function ProfilePage() {
  await requireAuth();

  let profile: StudentProfile;
  try {
    profile = await apiClient('/portal/student/profile');
  } catch (error) {
    redirect('/login');
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your profile information</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Info Card */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              <ProfileForm initialData={profile} />
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Student Info */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Student Information
              </h3>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Student ID</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {profile.studentId}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      {profile.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Program Type</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {profile.programType.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Enrolled Date</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatDate(profile.enrolledDate)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Center Info */}
            {profile.center && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Center Information
                </h3>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Center Name</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {profile.center.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Center Code</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {profile.center.code}
                    </dd>
                  </div>
                  {profile.center.email && (
                    <div>
                      <dt className="text-sm text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {profile.center.email}
                      </dd>
                    </div>
                  )}
                  {profile.center.phone && (
                    <div>
                      <dt className="text-sm text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {profile.center.phone}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Guardians */}
            {profile.guardians && profile.guardians.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Guardians
                </h3>
                <div className="mt-4 space-y-4">
                  {profile.guardians.map((guardian) => (
                    <div key={guardian.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                      <p className="font-medium text-gray-900">{guardian.fullname}</p>
                      {guardian.email && (
                        <p className="text-sm text-gray-600">{guardian.email}</p>
                      )}
                      {guardian.phone && (
                        <p className="text-sm text-gray-600">{guardian.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

