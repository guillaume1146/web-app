import { Controller, Get, Query, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { Public } from '../auth/decorators/public.decorator'
import { GeoService } from './geo.service'

@ApiTags('geo')
@Controller('api/geo')
export class GeoController {
  constructor(private geo: GeoService) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Find nearest providers of a given type' })
  @ApiQuery({ name: 'type', required: true, description: 'UserType code e.g. DOCTOR' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lng', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async nearestProviders(
    @Query('type') type: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('limit') limit?: string,
  ) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    if (isNaN(userLat) || isNaN(userLng)) throw new BadRequestException('Invalid lat/lng')

    const data = await this.geo.findNearestProviders(userLat, userLng, type, limit ? parseInt(limit) : 8)
    return { success: true, data }
  }

  @Public()
  @Get('entities')
  @ApiOperation({ summary: 'Find nearest healthcare entities (clinics, hospitals, labs)' })
  @ApiQuery({ name: 'type', required: false, description: 'Entity type: clinic|hospital|laboratory|pharmacy' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lng', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async nearestEntities(
    @Query('type') type: string | undefined,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('limit') limit?: string,
  ) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    if (isNaN(userLat) || isNaN(userLng)) throw new BadRequestException('Invalid lat/lng')

    const data = await this.geo.findNearestEntities(userLat, userLng, type ?? null, limit ? parseInt(limit) : 8)
    return { success: true, data }
  }

  @Public()
  @Get('map-data')
  @ApiOperation({ summary: 'All geo-tagged providers + entities for the map' })
  async mapData() {
    const [providers, entities] = await Promise.all([
      this.geo.getAllProvidersWithCoords(),
      this.geo.getAllEntitiesWithCoords(),
    ])
    return { success: true, data: { providers, entities } }
  }
}
