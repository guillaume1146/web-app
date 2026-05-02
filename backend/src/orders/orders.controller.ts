import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query('page') page?: string) {
    const result = await this.ordersService.list(user.sub, page);
    return { success: true, data: result.orders, pagination: result.pagination };
  }

  @Post()
  async create(
    @Body() body: { items: Array<{ pharmacyMedicineId?: string; medicineId?: string; quantity: number }> },
    @CurrentUser() user: JwtPayload,
  ) {
    // Accept legacy `medicineId` alongside canonical `pharmacyMedicineId`.
    const items = (body.items || []).map(i => ({
      pharmacyMedicineId: i.pharmacyMedicineId || i.medicineId || '',
      quantity: i.quantity,
    }));
    const result = await this.ordersService.createOrder(user.sub, items);
    // Flatten a few common fields at top level of data for older frontends
    // that expected `orderId`, `walletBalance`, `items`.
    return {
      success: true,
      data: {
        ...result,
        orderId: (result as any)?.id,
      },
    };
  }
}
