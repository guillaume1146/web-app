import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcrypt'
import { UserType } from '@prisma/client'
import { registerSchema } from '@/lib/auth/schemas'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * Maps signup-form user-type strings to Prisma UserType enum values.
 * These IDs match the constants in app/signup/constants.ts (e.g. 'nanny',
 * 'emergency'), which differ from the login-form IDs used in
 * cookieToPrismaUserType (e.g. 'child-care-nurse', 'ambulance').
 */
const signupTypeToPrisma: Record<string, UserType> = {
  'patient':          UserType.PATIENT,
  'doctor':           UserType.DOCTOR,
  'nurse':            UserType.NURSE,
  'nanny':            UserType.NANNY,
  'pharmacist':       UserType.PHARMACIST,
  'lab':              UserType.LAB_TECHNICIAN,
  'emergency':        UserType.EMERGENCY_WORKER,
  'insurance':        UserType.INSURANCE_REP,
  'corporate':        UserType.CORPORATE_ADMIN,
  'referral-partner': UserType.REFERRAL_PARTNER,
  'regional-admin':   UserType.REGIONAL_ADMIN,
}

export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const normalizedEmail = data.email.toLowerCase().trim()

    // ── Map form user type to Prisma enum ──────────────────────────────────
    const prismaUserType = signupTypeToPrisma[data.userType]
    if (!prismaUserType) {
      return NextResponse.json(
        { success: false, message: 'Unsupported user type' },
        { status: 400 }
      )
    }

    // ── Check for existing user ────────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // ── Hash password ──────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // ── Split full name into first / last ──────────────────────────────────
    const nameParts = data.fullName.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

    // ── Determine account status ───────────────────────────────────────────
    // REGIONAL_ADMIN requires super-admin approval (always pending).
    // Patients enrolling in a company require corporate admin approval.
    // All other user types are auto-activated.
    const requiresManualApproval = prismaUserType === UserType.REGIONAL_ADMIN
    const requiresCorporateApproval = prismaUserType === UserType.PATIENT && data.enrolledInCompany && data.companyId
    const hasSkippedDocuments = data.skippedDocuments.length > 0

    const accountStatus = requiresManualApproval
      ? 'pending'
      : requiresCorporateApproval
        ? 'pending_corporate'
        : 'active'

    // ── Create User + profile in a single transaction ──────────────────────
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          password: hashedPassword,
          phone: data.phone,
          userType: prismaUserType,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          address: data.address,
          verified: false,
          accountStatus,
          ...(data.regionId ? { regionId: data.regionId } : {}),
          ...(data.profileImage ? { profileImage: data.profileImage } : {}),
        },
      })

      // ── Create the type-specific profile ─────────────────────────────────
      switch (prismaUserType) {
        case UserType.PATIENT: {
          const patientProfile = await tx.patientProfile.create({
            data: {
              userId: newUser.id,
              nationalId: `PAT-${newUser.id.slice(0, 8).toUpperCase()}`,
              bloodType: 'Unknown',
              allergies: [],
              chronicConditions: [],
            },
          })

          // Create emergency contact if provided
          if (data.emergencyContactName && data.emergencyContactPhone) {
            await tx.patientEmergencyContact.create({
              data: {
                patientId: patientProfile.id,
                name: data.emergencyContactName,
                phone: data.emergencyContactPhone,
                relationship: data.emergencyContactRelation || 'Not specified',
              },
            })
          }
          break
        }

        case UserType.DOCTOR: {
          const doctorCat = data.doctorCategory === 'specialist' ? 'Specialist' : 'General Practitioner'
          await tx.doctorProfile.create({
            data: {
              userId: newUser.id,
              category: doctorCat,
              specialty: data.specialization ? [data.specialization] : [],
              subSpecialties: [],
              licenseNumber: data.licenseNumber || `DOC-${newUser.id.slice(0, 8).toUpperCase()}`,
              licenseExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now (placeholder)
              clinicAffiliation: data.institution || 'Not specified',
              hospitalPrivileges: [],
              experience: data.experience || '0 years',
              publications: [],
              awards: [],
              location: data.address,
              languages: [],
              consultationFee: 0,
              videoConsultationFee: 0,
              emergencyConsultationFee: 0,
              consultationTypes: ['video'],
              specialInterests: [],
              bio: '',
            },
          })
          break
        }

        case UserType.NURSE: {
          await tx.nurseProfile.create({
            data: {
              userId: newUser.id,
              licenseNumber: data.licenseNumber || `NRS-${newUser.id.slice(0, 8).toUpperCase()}`,
              experience: data.experience ? parseInt(data.experience, 10) || 0 : 0,
              specializations: data.specialization ? [data.specialization] : [],
            },
          })
          break
        }

        case UserType.NANNY: {
          await tx.nannyProfile.create({
            data: {
              userId: newUser.id,
              experience: data.experience ? parseInt(data.experience, 10) || 0 : 0,
              certifications: [],
            },
          })
          break
        }

        case UserType.PHARMACIST: {
          await tx.pharmacistProfile.create({
            data: {
              userId: newUser.id,
              licenseNumber: data.licenseNumber || `PHR-${newUser.id.slice(0, 8).toUpperCase()}`,
              pharmacyName: data.institution || 'Not specified',
              pharmacyAddress: data.address,
              specializations: data.specialization ? [data.specialization] : [],
            },
          })
          break
        }

        case UserType.LAB_TECHNICIAN: {
          await tx.labTechProfile.create({
            data: {
              userId: newUser.id,
              licenseNumber: data.licenseNumber || `LAB-${newUser.id.slice(0, 8).toUpperCase()}`,
              labName: data.institution || 'Not specified',
              specializations: data.specialization ? [data.specialization] : [],
            },
          })
          break
        }

        case UserType.EMERGENCY_WORKER: {
          await tx.emergencyWorkerProfile.create({
            data: {
              userId: newUser.id,
              certifications: [],
            },
          })
          break
        }

        case UserType.INSURANCE_REP: {
          await tx.insuranceRepProfile.create({
            data: {
              userId: newUser.id,
              companyName: data.companyName || data.institution || 'Not specified',
              licenseNumber: data.licenseNumber || null,
              coverageTypes: [],
            },
          })
          break
        }

        case UserType.CORPORATE_ADMIN: {
          await tx.corporateAdminProfile.create({
            data: {
              userId: newUser.id,
              companyName: data.companyName || 'Not specified',
              registrationNumber: data.companyRegistrationNumber || null,
            },
          })
          break
        }

        case UserType.REFERRAL_PARTNER: {
          await tx.referralPartnerProfile.create({
            data: {
              userId: newUser.id,
              businessType: data.businessType || 'Individual',
              commissionRate: 0,
              referralCode: `REF-${newUser.id.slice(0, 8).toUpperCase()}`,
              totalReferrals: 0,
            },
          })
          break
        }

        case UserType.REGIONAL_ADMIN: {
          await tx.regionalAdminProfile.create({
            data: {
              userId: newUser.id,
              region: data.targetRegion || 'Not specified',
              country: data.targetCountry || 'Not specified',
              countryCode: data.countryCode || null,
            },
          })
          break
        }
      }

      // Create trial wallet
      await tx.userWallet.create({
        data: {
          userId: newUser.id,
          balance: 4500,
          currency: 'MUR',
          initialCredit: 4500,
        },
      })

      // Create Document records for uploaded files
      if (data.documentUrls.length > 0) {
        await tx.document.createMany({
          data: data.documentUrls.map(doc => ({
            userId: newUser.id,
            name: doc.name,
            type: doc.type,
            url: doc.url,
            size: doc.size ?? null,
          })),
        })
      }

      // Create UserPreference with language from region
      if (data.regionId) {
        const region = await tx.region.findUnique({
          where: { id: data.regionId },
          select: { language: true },
        })
        if (region) {
          await tx.userPreference.create({
            data: {
              userId: newUser.id,
              language: region.language as 'en' | 'fr' | 'mfe',
            },
          })
        }
      }

      // Process referral code if provided
      if (data.referralCode) {
        const referrer = await tx.referralPartnerProfile.findUnique({
          where: { referralCode: data.referralCode },
          select: { id: true, userId: true, commissionRate: true },
        })

        if (referrer) {
          // Store referral code on the new user
          await tx.user.update({
            where: { id: newUser.id },
            data: { referredByCode: data.referralCode },
          })

          // Increment referrer's total referrals
          await tx.referralPartnerProfile.update({
            where: { id: referrer.id },
            data: { totalReferrals: { increment: 1 } },
          })

          // Credit referrer's wallet with signup bonus (Rs 100)
          const REFERRAL_SIGNUP_BONUS = 100
          const referrerWallet = await tx.userWallet.findUnique({
            where: { userId: referrer.userId },
            select: { id: true, balance: true },
          })

          if (referrerWallet) {
            await tx.userWallet.update({
              where: { id: referrerWallet.id },
              data: { balance: referrerWallet.balance + REFERRAL_SIGNUP_BONUS },
            })
            await tx.walletTransaction.create({
              data: {
                walletId: referrerWallet.id,
                type: 'credit',
                amount: REFERRAL_SIGNUP_BONUS,
                description: `Referral signup bonus — ${firstName} ${lastName}`,
                serviceType: 'referral',
                referenceId: newUser.id,
                balanceBefore: referrerWallet.balance,
                balanceAfter: referrerWallet.balance + REFERRAL_SIGNUP_BONUS,
                status: 'completed',
              },
            })
          }

          // Link referral click tracking record if trackingId provided
          if (data.trackingId) {
            try {
              await tx.referralClick.update({
                where: { id: data.trackingId },
                data: {
                  convertedUserId: newUser.id,
                  convertedAt: new Date(),
                },
              })
            } catch {
              // trackingId might be invalid or ReferralClick model not yet migrated
            }
          }
        }
      }

      // ── Corporate enrollment — create CorporateEmployee + notify admin ───
      if (requiresCorporateApproval && data.companyId) {
        // Find the corporate admin's user ID from their profile
        const corpProfile = await tx.corporateAdminProfile.findUnique({
          where: { id: data.companyId },
          select: { userId: true, companyName: true },
        })

        if (corpProfile) {
          await tx.corporateEmployee.create({
            data: {
              corporateAdminId: corpProfile.userId,
              userId: newUser.id,
              status: 'pending',
            },
          })

          // Notify the corporate admin
          await tx.notification.create({
            data: {
              userId: corpProfile.userId,
              title: 'New Employee Enrollment Request',
              message: `${firstName} ${lastName} has requested to join your company wellness program.`,
              type: 'corporate_enrollment',
            },
          })
        }
      }

      return newUser
    })

    // ── Return success ─────────────────────────────────────────────────────
    let message: string
    if (requiresManualApproval) {
      message = 'Registration submitted. Your account requires super-admin approval and will be reviewed within 2-5 business days.'
    } else if (requiresCorporateApproval) {
      message = 'Registration submitted. Your corporate administrator has been notified and will approve your enrollment shortly.'
    } else if (hasSkippedDocuments) {
      message = 'Registration successful! You can log in now. Please upload your remaining documents from your account settings.'
    } else {
      message = 'Registration successful! You can now log in.'
    }

    return NextResponse.json(
      { success: true, userId: user.id, accountStatus, hasSkippedDocuments, message },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    )
  }
}
