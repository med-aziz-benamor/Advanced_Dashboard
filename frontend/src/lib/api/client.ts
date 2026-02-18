/**
 * API Client - Fetch wrapper with error handling and JWT authentication
 */

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

/**
 * Handle 401 Unauthorized by logging out and redirecting to login
 */
function handleUnauthorized() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  
  // Only redirect if not already on login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Generic JSON fetcher with error handling and JWT authentication
 */
export async function getJSON<T>(
  path: string,
  signal?: AbortSignal
): Promise<T> {
  try {
    const token = getAuthToken()
    const headers: HeadersInit = {
      Accept: 'application/json',
    }
    
    // Attach JWT token if available (except for login endpoint)
    if (token && !path.includes('/api/auth/login')) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const response = await fetch(path, {
      method: 'GET',
      headers,
      signal,
    })

    // Handle 401 Unauthorized
    if (response.status === 401) {
      handleUnauthorized()
      throw new ApiError(401, 'Session expired. Please login again.')
    }

    if (!response.ok) {
      const errorMessage = await response.text().catch(() => 'Unknown error')
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${errorMessage}`
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }
}

/**
 * POST request with JSON body
 */
export async function postJSON<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  try {
    const token = getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    
    // Attach JWT token if available (except for login endpoint)
    if (token && !path.includes('/api/auth/login')) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const response = await fetch(path, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })

    // Handle 401 Unauthorized
    if (response.status === 401) {
      handleUnauthorized()
      throw new ApiError(401, 'Session expired. Please login again.')
    }

    if (!response.ok) {
      const errorMessage = await response.text().catch(() => 'Unknown error')
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${errorMessage}`
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }
}


export { ApiError }
