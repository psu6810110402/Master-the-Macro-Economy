import { Module, forwardRef } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { GameModule } from '../game/game.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    forwardRef(() => GameModule),
    AuditModule,
  ],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
