import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api/client";
import MainLayout from "@/components/layout/MainLayout";
import { AcademicProgress } from "@/types/student-portal.types";
import { formatDate } from "@/lib/utils/errorHandler";

export default async function AcademicProgressPage() {
  await requireAuth();

  let progress: AcademicProgress;
  try {
    progress = await apiClient("/portal/student/academic-progress");
  } catch (error) {
    redirect("/login");
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Academic Progress
          </h1>
          <p className="mt-2 text-gray-600">
            Track your academic performance and progress
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-500">
              Courses Enrolled
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {progress.coursesEnrolled}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-500">Active Batches</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {progress.activeBatches}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {progress.attendanceRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-500">Total Days</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {progress.totalAttendanceDays}
            </p>
          </div>
        </div>

        {/* Attendance Breakdown */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Breakdown
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Present Days</span>
                  <span className="text-lg font-semibold text-green-600">
                    {progress.presentDays}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${
                        progress.totalAttendanceDays > 0
                          ? (progress.presentDays /
                              progress.totalAttendanceDays) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Absent Days</span>
                  <span className="text-lg font-semibold text-red-600">
                    {progress.absentDays}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-red-600"
                    style={{
                      width: `${
                        progress.totalAttendanceDays > 0
                          ? (progress.absentDays /
                              progress.totalAttendanceDays) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Overall Progress
            </h2>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Attendance Rate</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {progress.attendanceRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 h-4 w-full rounded-full bg-gray-200">
                <div
                  className="h-4 rounded-full bg-indigo-600"
                  style={{ width: `${progress.attendanceRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enrolled Courses */}
        {progress.courses && progress.courses.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Enrolled Courses
            </h2>
            <div className="mt-4 space-y-3">
              {progress.courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{course.name}</p>
                    <p className="text-sm text-gray-500">{course.code}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Enrolled: {formatDate(course.enrolledAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
