import { Module, forwardRef } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { GameServerlessModule } from '../game/game-serverless.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => GameServerlessModule),
    AuditModule,
  ],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionServerlessModule {}
