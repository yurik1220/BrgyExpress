// Light-weight fetch utilities for the Expo mobile app
// - fetchAPI: thin wrapper around window.fetch with JSON parsing and error propagation
// - useFetch: React hook to load data with loading/error states and refetch support
import { useState, useEffect, useCallback } from "react";

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      // Add default timeout if not provided
      signal: options?.signal || AbortSignal.timeout(15000) // 15 second default timeout
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const errorMessage = `HTTP ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`;
      
      // Don't log console errors for specific user-facing errors that are handled in UI
      const shouldSuppressLog = (
        response.status === 403 && (text.includes('Account Disabled') || text.includes('Account Disabled. Please contact Barangay')) ||
        response.status === 401 ||
        response.status === 400 ||
        response.status === 404 ||
        response.status === 409 ||
        (response.status === 404 && text.includes('User not found')) ||
        text.includes('User not authenticated')
      );
      
      if (!shouldSuppressLog) {
        console.error("Fetch error:", errorMessage);
      }
      
      throw new Error(errorMessage);
    }
    // Some endpoints may return non-JSON or empty responses; guard parsing
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: true } as any;
    }
    return await response.json();
  } catch (error) {
        // Only log if it's not a user-facing error that's handled in UI
        const errorMessage = (error as Error).message;
        const isAbortError = error.name === 'AbortError' || errorMessage.includes('aborted');
        const isNetworkError = (
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('Connection') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT') ||
          isAbortError
        );
        
        const shouldSuppressLog = (
          errorMessage.includes('403') && (errorMessage.includes('Account Disabled') || errorMessage.includes('Account Disabled. Please contact Barangay')) ||
          errorMessage.includes('401') ||
          errorMessage.includes('400') ||
          errorMessage.includes('404') ||
          errorMessage.includes('409') ||
          (errorMessage.includes('404') && errorMessage.includes('User not found')) ||
          errorMessage.includes('User not authenticated') ||
          isNetworkError
        );
    
    if (!shouldSuppressLog) {
      console.error("Fetch error:", error);
    }
    
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      setData(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
