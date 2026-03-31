import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcrypt'
import { signToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { loginSchema } from '@/lib/auth/schemas'
import { prismaUserTypeToCookie } from '@/lib/auth/user-type-map'
import { rateLimitAuth } from '@/lib/rate-limit'
import { USER_TYPE_SLUGS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Look up user by email — userType is auto-detected from the database
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        profileImage: true,
        userType: true,
        accountStatus: true,
      },
    })

    if (!dbUser || !(await bcrypt.compare(password, dbUser.password))) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Enforce account status
    if (dbUser.accountStatus === 'pending') {
      return NextResponse.json(
        { success: false, message: 'Your account is pending approval. Please wait for admin verification.' },
        { status: 403 }
      )
    }
    if (dbUser.accountStatus === 'suspended') {
      return NextResponse.json(
        { success: false, message: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      )
    }

    // Auto-detect the cookie-friendly user type from the DB record
    let cookieUserType = prismaUserTypeToCookie[dbUser.userType]

    // Super admin override: if REGIONAL_ADMIN matches SUPER_ADMIN_EMAIL, use 'admin' cookie
    if (dbUser.userType === 'REGIONAL_ADMIN' && dbUser.email === process.env.SUPER_ADMIN_EMAIL) {
      cookieUserType = 'admin'
    }

    // Redirect to clean URL (middleware rewrites to /provider/{slug}/feed)
    const redirectPath = '/feed'

    // Generate JWT
    const token = signToken({ sub: dbUser.id, userType: cookieUserType, email: dbUser.email })

    // Build response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        email: dbUser.email,
        profileImage: dbUser.profileImage,
        userType: cookieUserType,
      },
      redirectPath,
      message: 'Login successful',
    })

    setAuthCookies(response, token, cookieUserType, dbUser.id)
    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
