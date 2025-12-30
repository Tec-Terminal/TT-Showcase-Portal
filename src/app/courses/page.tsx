import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api/client';
import MainLayout from '@/components/layout/MainLayout';
import { Course } from '@/types/student-portal.types';
import { formatDate } from '@/lib/utils/errorHandler';

export default async function CoursesPage() {
  await requireAuth();

  let courses: Course[];
  try {
    courses = await apiClient('/portal/student/courses');
  } catch (error) {
    redirect('/login');
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-2 text-gray-600">View all your enrolled courses</p>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">You are not enrolled in any courses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">Code: {course.code}</p>
                    <p className="mt-2 text-sm text-gray-600">
                      Duration: {course.duration} months
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Enrolled: {formatDate(course.enrolledAt)}
                    </p>
                  </div>
                </div>

                {course.batches && course.batches.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-gray-700">Batches:</p>
                    <div className="mt-2 space-y-2">
                      {course.batches.map((batch) => (
                        <div key={batch.id} className="text-sm text-gray-600">
                          <p>{batch.code}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(batch.startDate)} - {formatDate(batch.endDate)}
                          </p>
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

