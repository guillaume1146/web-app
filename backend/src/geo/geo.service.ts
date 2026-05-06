import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface NearestResult {
  id: string
  firstName: string
  lastName: string
  profileImage: string | null
  userType: string
  address: string | null
  latitude: number
  longitude: number
  distanceKm: number
  specialty?: string[]
}

export interface NearestEntityResult {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  phone: string | null
  latitude: number
  longitude: number
  distanceKm: number
}

@Injectable()
export class GeoService {
  constructor(private prisma: PrismaService) {}

  async findNearestProviders(
    userLat: number,
    userLng: number,
    providerType: string,
    limit = 8,
  ): Promise<NearestResult[]> {
    const users = await this.prisma.user.findMany({
      where: {
        userType: providerType as any,
        accountStatus: 'active',
        verified: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        userType: true,
        address: true,
        latitude: true,
        longitude: true,
        doctorProfile: { select: { specialty: true } },
        nurseProfile: { select: { specializations: true } },
      },
      take: 200,
    })

    return users
      .map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImage: u.profileImage,
        userType: u.userType,
        address: u.address,
        latitude: u.latitude!,
        longitude: u.longitude!,
        distanceKm: haversineKm(userLat, userLng, u.latitude!, u.longitude!),
        specialty: (u.doctorProfile?.specialty ?? u.nurseProfile?.specializations ?? []) as string[],
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit)
  }

  async findNearestEntities(
    userLat: number,
    userLng: number,
    entityType: string | null,
    limit = 8,
  ): Promise<NearestEntityResult[]> {
    const where: Record<string, unknown> = {
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    }
    if (entityType) where['type'] = entityType

    const entities = await this.prisma.healthcareEntity.findMany({
      where: where as any,
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        city: true,
        phone: true,
        latitude: true,
        longitude: true,
      },
      take: 200,
    })

    return entities
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        address: e.address,
        city: e.city,
        phone: e.phone,
        latitude: e.latitude!,
        longitude: e.longitude!,
        distanceKm: haversineKm(userLat, userLng, e.latitude!, e.longitude!),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit)
  }

  async getAllProvidersWithCoords(): Promise<NearestResult[]> {
    const users = await this.prisma.user.findMany({
      where: {
        accountStatus: 'active',
        verified: true,
        latitude: { not: null },
        longitude: { not: null },
        NOT: { userType: { in: ['MEMBER', 'REGIONAL_ADMIN'] as any[] } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        userType: true,
        address: true,
        latitude: true,
        longitude: true,
        doctorProfile: { select: { specialty: true } },
        nurseProfile: { select: { specializations: true } },
      },
      take: 500,
    })

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImage: u.profileImage,
      userType: u.userType,
      address: u.address,
      latitude: u.latitude!,
      longitude: u.longitude!,
      distanceKm: 0,
      specialty: (u.doctorProfile?.specialty ?? u.nurseProfile?.specializations ?? []) as string[],
    }))
  }

  async getAllEntitiesWithCoords(): Promise<NearestEntityResult[]> {
    const entities = await this.prisma.healthcareEntity.findMany({
      where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, name: true, type: true, address: true, city: true, phone: true, latitude: true, longitude: true },
    })

    return entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      address: e.address,
      city: e.city,
      phone: e.phone,
      latitude: e.latitude!,
      longitude: e.longitude!,
      distanceKm: 0,
    }))
  }
}
