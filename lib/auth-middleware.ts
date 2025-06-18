import { NextRequest, NextResponse } from 'next/server'
import { extractTokenFromHeader, verifyToken, JWTPayload } from './jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticateToken(request: NextRequest): { success: boolean; user?: JWTPayload; error?: string } {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return { success: false, error: 'No token provided' }
    }

    const user = verifyToken(token)
    if (!user) {
      return { success: false, error: 'Invalid or expired token' }
    }

    return { success: true, user }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

/**
 * Middleware to check if user has required role
 */
export function authorizeRole(user: JWTPayload, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role)
}

/**
 * Create authentication response for unauthorized requests
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

/**
 * Create forbidden response for insufficient permissions
 */
export function createForbiddenResponse(message: string = 'Insufficient permissions') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse> | NextResponse,
  allowedRoles?: string[]
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = authenticateToken(request)
    
    if (!auth.success || !auth.user) {
      return createUnauthorizedResponse(auth.error)
    }

    if (allowedRoles && !authorizeRole(auth.user, allowedRoles)) {
      return createForbiddenResponse()
    }

    return handler(request, auth.user)
  }
} 