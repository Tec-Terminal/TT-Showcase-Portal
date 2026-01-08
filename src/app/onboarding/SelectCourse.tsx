"use client";
import { useState, useEffect } from "react";
import { Search, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { FaLocationDot } from "react-icons/fa6";
import {
  onboardingService,
  Course,
  Center,
} from "@/lib/services/onboarding.service";
import { formatNairaWithSymbolDirect } from "@/lib/utils/currency";

interface SelectCourseProps {
  selectedCourse?: Course | null;
  selectedCenter?: Center | null;
  onSelect: (course: Course) => void;
  onBack?: () => void;
}

const COURSES_PER_PAGE = 6;

export default function SelectCourse({
  selectedCourse,
  selectedCenter,
  onSelect,
  onBack,
}: SelectCourseProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // Load courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await onboardingService.getCoursesWithPaymentInfo();
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          console.log("All courses loaded:", data);
          // Log detailed payment info for each course
          data.forEach((course) => {
            console.log(`Course: ${course.name}`, {
              id: course.id,
              minFee: course.paymentInfo?.minFee,
              maxFee: course.paymentInfo?.maxFee,
              byCenter: course.paymentInfo?.byCenter?.map((centerInfo) => ({
                centerName: centerInfo.center?.name,
                baseFee: centerInfo.baseFee,
                lumpSumFee: centerInfo.lumpSumFee,
              })),
            });
          });
          setCourses(data);
          if (data.length === 0) {
            setError("No courses available at this time.");
          }
        } else {
          console.error("Invalid response format:", data);
          setError("Invalid data format received from server.");
        }
      } catch (error) {
        console.error("Error loading courses:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load courses. Please try again.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  // Filter courses by search query
  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of course list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Get payment info for selected center or use center with minimum baseFee
  const getPaymentInfo = (course: Course) => {
    if (!course.paymentInfo?.byCenter || course.paymentInfo.byCenter.length === 0) {
      return null;
    }
    
    // If center is selected, find payment info for that center
    if (selectedCenter) {
      const centerInfo = course.paymentInfo.byCenter.find(
        (info) => info.centerId === selectedCenter.id
      );
      if (centerInfo) return centerInfo;
    }
    
    // When no center is selected, use the center with the minimum baseFee
    return course.paymentInfo.byCenter.reduce((min, current) => 
      current.baseFee < min.baseFee ? current : min
    );
  };

  // Toggle description expansion
  const toggleDescription = (courseId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-[#1A1A1A] mb-2">
            Select Your Course
          </h2>
          <p className="text-gray-500 text-sm">
            Please choose the courses you wish to register for below.
          </p>
        </div>

        {selectedCenter && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-[#6344F5]">
              <FaLocationDot
                size={20}
                fill="currentColor"
                className="text-[#6344F5]"
              />
              <span className="font-semibold text-md text-[#1A1A1A]">
                {selectedCenter.name}
              </span>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="text-[#6344F5] text-sm font-medium hover:underline mt-1"
              >
                Change Centre
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-12 max-w-100">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search by Course name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 rounded-xl text-gray-500 border border-gray-200 bg-white focus:ring-2 focus:ring-[#6344F5]/20 focus:border-[#6344F5] outline-none transition-all placeholder:text-gray-400 text-sm"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery ? "No courses found matching your search." : "No courses available."}
          </p>
        </div>
      ) : (
        <>
          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCourses.map((course) => {
            const isSelected = selectedCourse?.id === course.id;
            const paymentInfo = getPaymentInfo(course);
            
            if (!paymentInfo) {
              return null; // Skip courses without payment info
            }

            // Debug: Log payment info for the course
            console.log(`Course: ${course.name} - Payment Info:`, {
              centerName: paymentInfo.center?.name,
              baseFee: paymentInfo.baseFee,
              lumpSumFee: paymentInfo.lumpSumFee,
            });

            return (
              <div
                key={course.id}
                className={`group bg-white border rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col ${
                  isSelected
                    ? "border-[#6344F5] shadow-lg shadow-[#6344F5]/20"
                    : "border-gray-100 hover:border-transparent"
                }`}
              >
                {/* Title & Badge */}
                <div className="flex justify-between items-start mb-4 gap-3">
                  <h3 className="font-semibold text-xl leading-[1.3] text-[#1A1A1A] group-hover:text-[#6344F5] transition-colors">
                    {course.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full whitespace-nowrap">
                    <Clock size={13} strokeWidth={2.5} /> {course.duration} Months
                  </div>
                </div>

                {/* Description */}
                {course.description && (
                  <div className="mb-6">
                    <p
                      className={`text-sm text-gray-500 leading-relaxed ${
                        expandedDescriptions.has(course.id)
                          ? ""
                          : "line-clamp-2"
                      }`}
                    >
                      {course.description}
                    </p>
                    <button
                      onClick={() => toggleDescription(course.id)}
                      className="text-[#6344F5] text-xs font-medium hover:underline mt-2"
                    >
                      {expandedDescriptions.has(course.id)
                        ? "Show less"
                        : "Read more"}
                    </button>
                  </div>
                )}

                {/* Pricing */}
                <div className="mt-auto pt-8 border-t border-gray-200 flex items-center">
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                      Full Tuition
                    </p>
                    <p className="text-[18px] font-semibold text-[#1A1A1A]">
                      {formatNairaWithSymbolDirect(paymentInfo.lumpSumFee)}
                    </p>
                  </div>

                  <div className="h-10 w-px bg-gray-300 mx-4"></div>

                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-[#6344F5] font-bold mb-1">
                      Start From
                    </p>
                    <p className="text-[18px] font-semibold text-[#6344F5]">
                      {formatNairaWithSymbolDirect(paymentInfo.baseFee)}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelect(course)}
                    className={`ml-4 px-6 py-2 rounded-xl font-medium text-sm transition-all transform active:scale-95 ${
                      isSelected
                        ? "bg-[#6344F5] text-white"
                        : "bg-[#6344F5]/10 text-[#6344F5] hover:bg-[#6344F5] hover:text-white"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4">
              {/* Page Info */}
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} - {Math.min(endIndex, filteredCourses.length)} of {filteredCourses.length} courses
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#6344F5] hover:text-[#6344F5]"
                  }`}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!showPage) {
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`min-w-10 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                          currentPage === page
                            ? "bg-[#6344F5] text-white shadow-md"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#6344F5] hover:text-[#6344F5]"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#6344F5] hover:text-[#6344F5]"
                  }`}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation Buttons */}
      {selectedCourse && (
        <div className="mt-8 flex justify-end gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={() => onSelect(selectedCourse)}
            className="px-6 py-3 bg-[#6344F5] text-white rounded-xl font-medium text-sm hover:bg-[#5235E0] transition-all shadow-[0_8px_20px_-6px_rgba(99,68,245,0.45)]"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
