import { Module } from '@nestjs/common';
import { MacroEngineService } from './macro-engine.service';
import { BlackSwanService } from './black-swan.service';
import { ScoringService } from './scoring.service';
import { ScenarioService } from './scenario.service';
import { NewsGeneratorService } from './news-generator.service';
import { MacroEngineController } from './macro-engine.controller';

@Module({
  controllers: [MacroEngineController],
  providers: [
    MacroEngineService,
    BlackSwanService,
    ScoringService,
    ScenarioService,
    NewsGeneratorService,
  ],
  exports: [
    MacroEngineService,
    BlackSwanService,
    ScoringService,
    ScenarioService,
    NewsGeneratorService,
  ],
})
export class MacroEngineModule {}
