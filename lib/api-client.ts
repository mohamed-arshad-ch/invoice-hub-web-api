/**
 * API Client utility for making authenticated requests with JWT tokens
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Get the JWT token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

/**
 * Remove the JWT token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
  }
}

/**
 * Store the JWT token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        removeAuthToken()
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
        }
      }
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('API request failed:', error)
    return {
      success: false,
      error: 'Network error occurred',
    }
  }
}

/**
 * Make a GET request
 */
export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: 'GET' })
}

/**
 * Make a POST request
 */
export async function apiPost<T = any>(
  url: string,
  data: any
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Make a PUT request
 */
export async function apiPut<T = any>(
  url: string,
  data: any
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Make a DELETE request
 */
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: 'DELETE' })
}

/**
 * Refresh the JWT token
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    const token = getAuthToken()
    if (!token) return false

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.token) {
        setAuthToken(data.token)
        return true
      }
    }

    removeAuthToken()
    return false
  } catch (error) {
    console.error('Token refresh failed:', error)
    removeAuthToken()
    return false
  }
}

/**
 * Logout user by removing token and calling logout API
 */
export async function logout(): Promise<void> {
  try {
    // Call logout API
    await apiPost('/api/auth/logout', {})
  } catch (error) {
    console.error('Logout API call failed:', error)
  } finally {
    // Always remove token from localStorage
    removeAuthToken()
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
  }
} 