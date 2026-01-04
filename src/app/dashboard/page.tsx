import { requireAuthAndProfile } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { HiMiniCreditCard } from "react-icons/hi2";
import { Calendar, Clock } from "lucide-react";
import { MdDashboard, MdLocalPhone } from "react-icons/md";
import {
  getStudentDashboardData,
  getNotifications,
  getProfile,
} from "@/lib/network-server";
import DashboardNotifications from "@/components/notifications/DashboardNotifications";
import LogoutButton from "@/components/auth/LogoutButton";
import { formatDate } from "@/lib/utils/errorHandler";

export default async function DashboardPage() {
  await requireAuthAndProfile();

  let dashboardData;

  try {
    const response = await getStudentDashboardData();
    dashboardData = response.data || response;
    console.log("Dashboard Data:", dashboardData);
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    dashboardData = {
      profile: null,
      courses: [],
      currentCourse: null,
      currentBatch: null,
    };
  }

  // Fetch notifications
  let notifications = [];
  try {
    const notificationsResponse = await getNotifications({ limit: 20 });
    notifications =
      notificationsResponse.data || notificationsResponse.notifications || [];
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    notifications = [];
  }

  // Fetch profile separately to get course and center manager data
  let profileData = null;
  try {
    profileData = await getProfile();
    const profile = profileData.data || profileData;
  } catch (error: any) {
    console.error("Error fetching profile:", error);
  }

  // Extract data with fallbacks
  const student = profileData?.data ||
    profileData ||
    dashboardData.profile ||
    dashboardData.student || {
      fullName: "Student",
      studentId: "N/A",
    };

  let batch = dashboardData.currentBatch;
  if (
    !batch &&
    dashboardData.batches &&
    Array.isArray(dashboardData.batches) &&
    dashboardData.batches.length > 0
  ) {
    batch =
      dashboardData.batches.find((b: any) => b.status === "ACTIVE") ||
      dashboardData.batches[0];
  }

  let course = null;

  if (
    student?.courses &&
    Array.isArray(student.courses) &&
    student.courses.length > 0
  ) {
    const studentCourse = student.courses[0];
    course = studentCourse.course || studentCourse;
  } else if (batch?.course) {
    course = batch.course;
  } else if (
    dashboardData.courses &&
    Array.isArray(dashboardData.courses) &&
    dashboardData.courses.length > 0
  ) {
    const dashboardCourse = dashboardData.courses[0];
    course = dashboardCourse.course || dashboardCourse;
  }

  const schedules = batch?.schedules || [];

  const instructors = batch?.instructors || [];

  const center =
    student?.center ||
    profileData?.data?.center ||
    profileData?.center ||
    dashboardData.profile?.center ||
    dashboardData.center ||
    null;

  const centerManager =
    dashboardData.profile?.center?.manager ||
    student?.center?.manager ||
    profileData?.data?.center?.manager ||
    profileData?.center?.manager ||
    dashboardData.centerManager ||
    dashboardData.center?.manager ||
    center?.manager ||
    null;

  // Get next payment information from upcomingPayments array
  // Filter out payments that are already paid (status APPROVED or PAID)
  const allPayments = dashboardData.upcomingPayments || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

  const upcomingPayments = allPayments
    .filter((payment: any) => {
      const status = payment.status?.toUpperCase();
      // Filter out paid payments
      if (
        status === "APPROVED" ||
        status === "PAID" ||
        status === "COMPLETED"
      ) {
        return false;
      }

      // Only include payments with valid due dates in the future or today
      if (payment.dueDate) {
        const dueDate = new Date(payment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        // Include if due date is today or in the future
        return dueDate >= today;
      }

      return true;
    })
    .sort((a: any, b: any) => {
      // Sort by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });

  // Get the next payment (first unpaid payment)
  const nextPayment = upcomingPayments.length > 0 ? upcomingPayments[0] : null;

  // Format schedule string
  const formatSchedule = () => {
    if (!schedules || schedules.length === 0) {
      return "Not yet assigned to a schedule";
    }

    const scheduleStrings = schedules.map((schedule: any) => {
      const day = schedule.day?.substring(0, 3) || schedule.day;
      return `${day} (${schedule.startTime} - ${schedule.endTime})`;
    });

    return scheduleStrings.join(", ");
  };

  const scheduleString = formatSchedule();
  const batchCode = batch?.code || "Not yet assigned to a batch";
  const batchDuration =
    batch?.duration || (course?.duration ? `${course.duration} Weeks` : "N/A");

  // Format payment message
  const formatPaymentMessage = (message: string) => {
    // Check if message is in format "Installment X of Y"
    const installmentMatch = message.match(/Installment\s+\d+\s+of\s+(\d+)/i);
    if (installmentMatch) {
      const totalInstallments = installmentMatch[1];
      return `${totalInstallments} Total Installments`;
    }
    // Return original message if format doesn't match
    return message;
  };

  // Progress should be 0 for now
  const progress = 0;

  const getProgressText = () => {
    if (!batch || batchCode === "Not yet assigned to a batch") {
      return "Classes have not started";
    }
    return "Classes have not started";
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Image
                src="/images/Logo.png"
                alt="TT Showcase"
                width={140}
                height={35}
                className="object-contain"
              />
            </Link>
            <div className="hidden md:flex gap-6">
              <Link
                href="/dashboard"
                className="text-indigo-600 font-bold border-b-2 border-indigo-600 pb-1 flex items-center gap-2"
              >
                <span className="text-lg">
                  <MdDashboard />
                </span>{" "}
                Dashboard
              </Link>
              <Link
                href="/payments"
                className="text-gray-400 hover:text-gray-600 flex items-center gap-2"
              >
                <span className="text-lg">
                  <HiMiniCreditCard />
                </span>{" "}
                My Payments
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800 leading-none">
                {student.fullName}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                ID: {student.studentId}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-10">
          <h1 className="text-[26px] font-bold text-gray-900">
            Learning Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your academic journey and finances.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course & Center Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/30">
                  <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-1">
                    Current Course
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {dashboardData.currentCourse.name || "No course assigned"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock size={15} />
                    {batch?.duration ??
                      dashboardData.currentCourse.duration} months
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/30">
                  <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-1">
                    Batch
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {batchCode}
                  </h2>
                  <p className="text-xs text-gray-500 mt-2">
                    {batch?.status === "ACTIVE"
                      ? "Active Batch"
                      : batch?.status || "N/A"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/30 mb-8">
                <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-1">
                  Class Schedule
                </p>
                <h2 className="text-md font-bold text-gray-800">
                  {scheduleString}
                </h2>
                <p className="text-xs text-gray-500 mt-2">
                  {batch?.status === "ACTIVE"
                    ? "Active Batch"
                    : batch?.status || "N/A"}
                </p>
                {batch?.startDate && batch?.endDate && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(batch.startDate)} - {formatDate(batch.endDate)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Course Progress
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {getProgressText()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-2">
                  {instructors.length > 1 ? "Instructors" : "Instructor"}
                </p>
                {instructors.length > 0 ? (
                  <div className="space-y-2">
                    {instructors.map((instructor: any, index: number) => (
                      <div
                        key={instructor.id || index}
                        className={
                          index > 0 ? "pt-2 border-t border-gray-100" : ""
                        }
                      >
                        <h3 className="font-bold text-gray-900">
                          {instructor.fullname || "Not assigned"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {instructor.phone || "N/A"}
                        </p>
                        {instructor.course && (
                          <p className="text-xs text-gray-400 mt-1">
                            {instructor.course.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-gray-900">Not assigned</h3>
                    <p className="text-sm text-gray-500">N/A</p>
                  </>
                )}
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-2">
                  Centre Details
                </p>
                <h3 className="font-bold text-gray-900">
                  {center?.name || "Not assigned"}
                </h3>
                <p className="text-sm text-gray-500">
                  {center?.address || "N/A"}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-2">
                  Center Manager
                </p>
                <h3 className="font-bold text-gray-900">
                  {centerManager?.fullname ||
                    centerManager?.fullName ||
                    centerManager?.name ||
                    "Not assigned"}
                </h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <MdLocalPhone />
                  {centerManager?.phone || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-4">
                Next Payment
              </p>
              {nextPayment ? (
                <>
                  {nextPayment.amount === 0 || nextPayment.amount === null ? (
                    <>
                      <h2 className="text-2xl font-bold text-green-600">
                        Fully Paid
                      </h2>
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                        <Calendar size={16} />
                        No due dates available
                      </p>
                      {nextPayment.message && (
                        <p className="text-xs text-gray-400 mt-2">
                          {formatPaymentMessage(nextPayment.message)}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-indigo-600">
                        ₦{nextPayment.amount.toLocaleString()}
                      </h2>
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                        <Calendar size={16} />
                        Due{" "}
                        {new Date(nextPayment.dueDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                      {nextPayment.message && (
                        <p className="text-xs text-gray-400 mt-2">
                          {formatPaymentMessage(nextPayment.message)}
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-400">
                    No outstanding payments
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    All payments are up to date
                  </p>
                </>
              )}
            </div>

            <DashboardNotifications notifications={notifications} />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-8 flex justify-between items-center text-[11px] text-gray-400">
        <p>2026 TT Showcase Student Portal. All rights reserved.</p>
        <Link href="#" className="hover:underline">
          Contact Support
        </Link>
      </footer>
    </div>
  );
}
