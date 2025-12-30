import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';
import MainLayout from '@/components/layout/MainLayout';
import { Batch } from '@/types/student-portal.types';
import { formatDate } from '@/lib/utils/errorHandler';

export default async function BatchesPage() {
  await requireAuth();

  let batches: Batch[];
  try {
    batches = await apiClient('/portal/student/batches');
  } catch (error) {
    redirect('/login');
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Batches</h1>
          <p className="mt-2 text-gray-600">View your batch schedules and faculty information</p>
        </div>

        {batches.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">You are not assigned to any batches yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {batches.map((batch) => (
              <div key={batch.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{batch.code}</h3>
                    <p className="mt-1 text-sm text-gray-500">{batch.course.name}</p>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="text-sm font-medium text-gray-900">{batch.duration}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          {batch.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(batch.startDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">End Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(batch.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedules */}
                {batch.schedules && batch.schedules.length > 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Schedule
                    </h4>
                    <div className="mt-4 space-y-3">
                      {batch.schedules.map((schedule, idx) => (
                        <div key={idx} className="rounded-md bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{schedule.day}</p>
                              <p className="text-sm text-gray-600">
                                {schedule.startTime} - {schedule.endTime}
                              </p>
                            </div>
                            {schedule.faculty && (
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {schedule.faculty.fullname}
                                </p>
                                {schedule.faculty.phone && (
                                  <p className="text-sm text-gray-600">
                                    {schedule.faculty.phone}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faculties */}
                {batch.faculties && batch.faculties.length > 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Faculty
                    </h4>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {batch.faculties.map((facultyAssignment, idx) => (
                        <div key={idx} className="rounded-md border p-4">
                          <p className="font-medium text-gray-900">
                            {facultyAssignment.faculty.fullname}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {facultyAssignment.course.name}
                          </p>
                          {facultyAssignment.faculty.phone && (
                            <p className="mt-1 text-sm text-gray-500">
                              {facultyAssignment.faculty.phone}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

