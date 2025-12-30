import { clientApiClient } from '../api/client-client';

// Type definitions
export interface Location {
  id: string;
  state: string;
  capital: string;
}

export interface Center {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  status: string;
}

export interface CentersResponse {
  location: {
    id: string;
    state: string;
  };
  centers: Center[];
}

export interface CoursePaymentInfo {
  centerId: string;
  center: {
    id: string;
    name: string;
    code: string;
  };
  lumpSumFee: number;
  baseFee: number;
  oldCourseFee: number | null;
  maxInstallments: number;
  costPerInstallment: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  duration: number;
  type: string;
  status: string;
  paymentInfo: {
    minFee: number;
    maxFee: number;
    maxInstallments: number;
    byCenter: CoursePaymentInfo[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CoursesByCenterResponse {
  center: {
    id: string;
    name: string;
    code: string;
  };
  courses: Course[];
}

// Onboarding API Service
export const onboardingService = {
  /**
   * Get all available locations (states)
   */
  async getLocations(): Promise<Location[]> {
    try {
      const response = await clientApiClient('/onboarding/locations');
      
      // Handle different response formats
      if (Array.isArray(response)) {
        return response;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response?.locations && Array.isArray(response.locations)) {
        return response.locations;
      } else {
        console.error('Unexpected response format:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw new Error('Failed to fetch locations');
    }
  },

  /**
   * Get centers by location ID
   */
  async getCentersByLocation(locationId: string): Promise<CentersResponse> {
    if (!locationId) {
      throw new Error('Location ID is required');
    }
    try {
      const response = await clientApiClient(
        `/onboarding/locations/${locationId}/centers`
      );
      return response;
    } catch (error) {
      console.error('Error fetching centers:', error);
      throw new Error('Failed to fetch centers');
    }
  },

  /**
   * Get all courses with payment information
   */
  async getCoursesWithPaymentInfo(): Promise<Course[]> {
    try {
      const response = await clientApiClient('/onboarding/courses');
      
      // Handle different response formats
      if (Array.isArray(response)) {
        return response;
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response?.courses && Array.isArray(response.courses)) {
        return response.courses;
      } else {
        console.error('Unexpected response format:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw new Error('Failed to fetch courses');
    }
  },

  /**
   * Get courses by center ID (optional)
   */
  async getCoursesByCenter(centerId: string): Promise<CoursesByCenterResponse> {
    if (!centerId) {
      throw new Error('Center ID is required');
    }
    try {
      const response = await clientApiClient(
        `/onboarding/centers/${centerId}/courses`
      );
      return response;
    } catch (error) {
      console.error('Error fetching courses by center:', error);
      throw new Error('Failed to fetch courses');
    }
  },

  /**
   * Get center details with bank accounts
   * Note: This endpoint may require authentication
   */
  async getCenterDetails(centerId: string): Promise<any> {
    if (!centerId) {
      throw new Error('Center ID is required');
    }
    try {
      const response = await clientApiClient(`/centers/${centerId}`);
      return response;
    } catch (error: any) {
      // Don't throw - just log the error so payment can continue
      console.error('Error fetching center details:', error);
      throw error; // Re-throw so caller knows it failed
    }
  },
};

