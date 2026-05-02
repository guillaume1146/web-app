import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.favorites.list(user.sub) };
  }

  @Post(':providerId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggle(@Param('providerId') providerId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.favorites.toggle(user.sub, providerId);
    return { success: true, data: result };
  }
}
