"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Check, ChevronDown } from "lucide-react";
import { StudentProfile } from "@/types/student-portal.types";
import {
  onboardingService,
  Location,
  Center,
} from "@/lib/services/onboarding.service";

interface ProfileFormProps {
  initialData?: StudentProfile | any;
  onNext: (data: any) => void;
}

export default function ProfileForm({ initialData, onNext }: ProfileFormProps) {
  const [hasGuardian, setHasGuardian] = useState(
    initialData?.guardians?.[0]?.fullname ? true : false
  );
  const [locations, setLocations] = useState<Location[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      trainingLocation: initialData?.trainingLocation || initialData?.center?.state || "",
      centre: initialData?.centre || initialData?.center?.id || "",
      studentAddress: initialData?.studentAddress || initialData?.address || "",
      guardianName: initialData?.guardianName || initialData?.guardians?.[0]?.fullname || "",
      guardianPhone: initialData?.guardianPhone || initialData?.guardians?.[0]?.phone || "",
      guardianEmail: initialData?.guardianEmail || initialData?.guardians?.[0]?.email || "",
      guardianAddress: initialData?.guardianAddress || initialData?.guardians?.[0]?.address || "",
    },
  });

  const selectedLocation = watch("trainingLocation");

  // Load locations on mount - only show states that have centers
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        setLocationError(null);
        const allLocations = await onboardingService.getLocations();
        
        // Ensure data is an array
        if (!Array.isArray(allLocations)) {
          console.error("Invalid response format:", allLocations);
          setLocationError("Invalid data format received from server.");
          setLoadingLocations(false);
          return;
        }

        // Check which locations have centers
        const locationsWithCenters = await Promise.all(
          allLocations.map(async (location) => {
            try {
              const centersData = await onboardingService.getCentersByLocation(location.id);
              return centersData.centers && centersData.centers.length > 0 ? location : null;
            } catch (error) {
              // If error fetching centers, exclude this location
              return null;
            }
          })
        );

        // Filter out null values (locations without centers)
        const filteredLocations = locationsWithCenters.filter(
          (location): location is Location => location !== null
        );

        setLocations(filteredLocations);
        if (filteredLocations.length === 0) {
          setLocationError("No locations with available centers at this time.");
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load locations. Please try again.";
        setLocationError(errorMessage);
      } finally {
        setLoadingLocations(false);
      }
    };
    loadLocations();
  }, []);

  // Load centers when location is selected
  useEffect(() => {
    const loadCenters = async () => {
      if (selectedLocation) {
        try {
          setLoadingCenters(true);
          const data = await onboardingService.getCentersByLocation(
            selectedLocation
          );
          setCenters(data.centers);
          // Reset center selection when location changes
          setValue("centre", "");
        } catch (error) {
          console.error("Error loading centers:", error);
          setCenters([]);
        } finally {
          setLoadingCenters(false);
        }
      } else {
        setCenters([]);
        setValue("centre", "");
      }
    };
    loadCenters();
  }, [selectedLocation, setValue]);

  const onSubmit = async (data: any) => {
    // Find the selected center object
    const selectedCenterObj = centers.find((c) => c.id === data.centre);
    
    const formData = {
      ...data,
      hasGuardian,
      selectedCenter: selectedCenterObj || null,
    };
    onNext(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Complete your profile
        </h1>
        <p className="text-gray-500 font-normal">
          A few questions before we register you
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* --- Location --- */}
        <div className="space-y-6">
          <div className="relative flex items-center">
            <div className="grow border-t border-gray-300"></div>
            <span className="shrink mx-4 text-xs font-normal text-gray-500 uppercase tracking-[0.2em]">
              Location Information
            </span>
            <div className="grow border-t border-gray-300"></div>
          </div>

          <div className="grid gap-5">
            <div className="relative">
              <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                Training Location*
              </label>
              <div className="relative">
                <select
                  {...register("trainingLocation", { required: true })}
                  disabled={loadingLocations}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none appearance-none bg-white text-gray-500 placeholder:text-gray-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingLocations ? "Loading locations..." : "Select a state"}
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.state}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
              </div>
              {locationError && (
                <div className="mt-2">
                  <p className="text-red-500 text-xs mb-2">{locationError}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLoadingLocations(true);
                        setLocationError(null);
                        const allLocations = await onboardingService.getLocations();
                        
                        if (!Array.isArray(allLocations)) {
                          setLocationError("Invalid data format received from server.");
                          setLoadingLocations(false);
                          return;
                        }

                        // Check which locations have centers
                        const locationsWithCenters = await Promise.all(
                          allLocations.map(async (location) => {
                            try {
                              const centersData = await onboardingService.getCentersByLocation(location.id);
                              return centersData.centers && centersData.centers.length > 0 ? location : null;
                            } catch (error) {
                              // If error fetching centers, exclude this location
                              return null;
                            }
                          })
                        );

                        // Filter out null values (locations without centers)
                        const filteredLocations = locationsWithCenters.filter(
                          (location): location is Location => location !== null
                        );

                        setLocations(filteredLocations);
                        if (filteredLocations.length === 0) {
                          setLocationError("No locations with available centers at this time.");
                        }
                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Failed to load locations. Please try again.";
                        setLocationError(errorMessage);
                      } finally {
                        setLoadingLocations(false);
                      }
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {errors.trainingLocation && (
                <p className="text-red-500 text-xs mt-1">Training location is required</p>
              )}
            </div>

            <div className="relative">
              <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                Available Centres*
              </label>
              <div className="relative">
                <select
                  {...register("centre", { required: true })}
                  disabled={!selectedLocation || loadingCenters}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none appearance-none bg-white text-gray-500 placeholder:text-gray-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingCenters
                      ? "Loading centers..."
                      : !selectedLocation
                      ? "Select a location first"
                      : "Select a Centre"}
                  </option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
              </div>
              {errors.centre && (
                <p className="text-red-500 text-xs mt-1">Centre selection is required</p>
              )}
            </div>

            <div className="relative">
              <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                Student Address*
              </label>
              <input
                type="text"
                placeholder="Enter your residential address"
                {...register("studentAddress", { required: true })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none appearance-none bg-white text-gray-500 placeholder:text-gray-300 transition-all"
              />
              {errors.studentAddress && (
                <p className="text-red-500 text-xs mt-1">Student address is required</p>
              )}
            </div>
          </div>
        </div>

        {/* --- Guardian Toggle --- */}
        <div
          className="flex items-center gap-3 cursor-pointer group w-fit"
          onClick={() => setHasGuardian(!hasGuardian)}
        >
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              hasGuardian
                ? "bg-indigo-600 border-indigo-600"
                : "border-gray-300 group-hover:border-indigo-400"
            }`}
          >
            {hasGuardian && (
              <Check size={14} strokeWidth={4} className="text-white" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">
            I have a Sponsor/Guardian
          </span>
        </div>

        {/* --- Guardian Section --- */}
        {hasGuardian && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="relative flex items-center">
              <div className="grow border-t border-gray-300"></div>
              <span className="shrink mx-4 text-xs font-normal text-gray-500 uppercase tracking-[0.2em]">
                Guardian Information
              </span>
              <div className="grow border-t border-gray-300"></div>
            </div>

            <div className="grid gap-5">
              <div className="relative">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  Guardian/Sponsor Name*
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Full name of Parent or Guardian"
                    {...register("guardianName", { required: hasGuardian })}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none appearance-none bg-white text-gray-500 placeholder:text-gray-300 transition-all"
                  />
                  {errors.guardianName && hasGuardian && (
                    <p className="text-red-500 text-xs mt-1">Guardian name is required</p>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  Phone Number*
                </label>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50/50 min-w-25 justify-center">
                    <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
                      <span className="text-base">🇳🇬</span> +234
                    </span>
                  </div>
                  <input
                    type="tel"
                    placeholder="80..."
                    {...register("guardianPhone", { required: hasGuardian })}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-300 text-gray-500"
                  />
                  {errors.guardianPhone && hasGuardian && (
                    <p className="text-red-500 text-xs mt-1">Guardian phone is required</p>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  {...register("guardianEmail")}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-300 text-gray-500"
                />
              </div>

              <div className="relative">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  Guardian/Sponsor Address*
                </label>
                <input
                  type="text"
                  placeholder="Enter guardian's residential address"
                  {...register("guardianAddress", { required: hasGuardian })}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none appearance-none bg-white text-gray-500 placeholder:text-gray-300 transition-all"
                />
                {errors.guardianAddress && hasGuardian && (
                  <p className="text-red-500 text-xs mt-1">Guardian address is required</p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-[#6344F5] hover:bg-[#5235E0] text-white font-medium rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(99,68,245,0.45)] active:scale-[0.98]"
        >
          Next
        </button>
      </form>
    </div>
  );
}
