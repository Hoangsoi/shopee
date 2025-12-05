import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in your .env.local file.');
}

// Type assertion: After the check above, JWT_SECRET is guaranteed to be a string
const JWT_SECRET_STRING: string = JWT_SECRET;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: number, identifier: string, role?: string): string {
  return jwt.sign(
    { userId, identifier, role: role || 'user' },
    JWT_SECRET_STRING,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_STRING) as JWTPayload;
    // Backward compatibility: nếu có email cũ thì giữ lại
    if (decoded.email && !decoded.identifier) {
      decoded.identifier = decoded.email;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

// Helper to check if user is admin
// This function verifies the token and checks the role from database for security
// Works with both NextRequest and Request types
export async function isAdmin(request: Request | { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<boolean> {
  // Handle NextRequest (has cookies.get method)
  let token: string | undefined;
  if ('cookies' in request && typeof request.cookies.get === 'function') {
    token = request.cookies.get('auth-token')?.value;
  } else {
    // Handle standard Request (parse from cookie header)
    token = (request as Request).headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
  }
  
  if (!token) {
    return false;
  }
  
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return false;
  }
  
  // Always check role from database for security (don't trust token role alone)
  try {
    const sql = (await import('@/lib/db')).default;
    const users = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
    
    if (users.length === 0) {
      return false;
    }
    
    // Normalize role để so sánh chính xác (trim và lowercase)
    const dbRole = users[0].role?.toString().trim().toLowerCase() || 'user';
    
    // Debug logging trong development
    if (process.env.NODE_ENV === 'development') {
      console.log('isAdmin check:', {
        userId: decoded.userId,
        dbRole: users[0].role,
        dbRoleNormalized: dbRole,
        isAdmin: dbRole === 'admin'
      });
    }
    
    return dbRole === 'admin';
  } catch (error) {
    // If database check fails, fallback to token role (less secure but better than nothing)
    const tokenRole = decoded.role?.toString().trim().toLowerCase() || 'user';
    if (process.env.NODE_ENV === 'development') {
      console.log('isAdmin fallback to token:', {
        userId: decoded.userId,
        tokenRole: decoded.role,
        tokenRoleNormalized: tokenRole,
        isAdmin: tokenRole === 'admin'
      });
    }
    return tokenRole === 'admin';
  }
}

// Helper to get authenticated user from request
export async function getAuthenticatedUser(request: Request): Promise<{ userId: number; role: string } | null> {
  const token = request.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
  
  if (!token) {
    return null;
  }
  
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return null;
  }
  
  try {
    const sql = (await import('@/lib/db')).default;
    const users = await sql`SELECT id, role FROM users WHERE id = ${decoded.userId}`;
    
    if (users.length === 0) {
      return null;
    }
    
    return {
      userId: users[0].id,
      role: users[0].role || 'user',
    };
  } catch (error) {
    return null;
  }
}

