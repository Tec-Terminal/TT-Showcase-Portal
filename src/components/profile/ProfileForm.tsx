"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { StudentProfile } from "@/types/student-portal.types";
import { updateProfileClient } from "@/lib/network";
import {
  profileUpdateSchema,
  type ProfileUpdateFormData,
} from "@/lib/validations/profile.schema";

interface ProfileFormProps {
  initialData: StudentProfile;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateFormData>({
    resolver: yupResolver(profileUpdateSchema) as any,
    defaultValues: {
      fullName: initialData.fullName,
      email: initialData.email,
      phone: initialData.phone || "",
      address: initialData.address || "",
      image: initialData.image || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateProfileClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
  });

  const onSubmit = async (data: ProfileUpdateFormData) => {
    // Only send fields that have values
    const updateData: Record<string, string> = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.address) updateData.address = data.address;
    if (data.image) updateData.image = data.image;

    updateMutation.mutate(updateData);
  };

  const message = updateMutation.isSuccess
    ? {
        type: "success" as const,
        text: "Profile updated successfully",
      }
    : updateMutation.isError
      ? {
          type: "error" as const,
          text:
            (updateMutation.error as Error).message ||
            "Failed to update profile",
        }
      : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            {...register("fullName")}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm ${
              errors.fullName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-indigo-500"
            }`}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            {...register("email")}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm ${
              errors.email
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-indigo-500"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            {...register("phone")}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm ${
              errors.phone
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-indigo-500"
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Address
          </label>
          <textarea
            id="address"
            rows={3}
            {...register("address")}
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm ${
              errors.address
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-indigo-500"
            }`}
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">
              {errors.address.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || updateMutation.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || updateMutation.isPending
            ? "Updating..."
            : "Update Profile"}
        </button>
      </div>
    </form>
  );
}
