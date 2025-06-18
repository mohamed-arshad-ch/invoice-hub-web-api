import jwt from 'jsonwebtoken'

// JWT secret key - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const JWT_EXPIRES_IN = '7d' // Token expires in 7 days

export interface JWTPayload {
  userId: number
  email: string
  role: 'admin' | 'staff' | 'client'
  firstName: string
  lastName: string
  client_id?: number | null
  staff_id?: number | null
  iat?: number
  exp?: number
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  } catch {
    return true
  }
}

/**
 * Refresh token (generate new token with same payload but new expiration)
 */
export function refreshToken(token: string): string | null {
  const payload = verifyToken(token)
  if (!payload) return null
  
  // Remove iat and exp from payload for new token
  const { iat, exp, ...tokenPayload } = payload
  return generateToken(tokenPayload)
}

/**
 * Validate user role for API access
 */
export function validateUserRole(token: string, allowedRoles: string[]): boolean {
  const payload = verifyToken(token)
  if (!payload) return false
  
  return allowedRoles.includes(payload.role)
}

/**
 * Get user data from token
 */
export function getUserFromToken(token: string): JWTPayload | null {
  return verifyToken(token)
} 