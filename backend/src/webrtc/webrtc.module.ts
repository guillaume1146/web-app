import { Module } from '@nestjs/common';
import { WebRtcGateway } from './webrtc.gateway';
import { WebRtcController } from './webrtc.controller';
import { WebRtcService } from './webrtc.service';

@Module({
  providers: [WebRtcGateway, WebRtcService],
  controllers: [WebRtcController],
  exports: [WebRtcGateway, WebRtcService],
})
export class WebRtcModule {}
