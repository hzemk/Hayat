import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @Post('chat')
  chat(@CurrentUser('userId') userId: string, @Body() dto: ChatDto) {
    return this.ai.chat(userId, dto);
  }

  @Get('conversations')
  listConversations(@CurrentUser('userId') userId: string) {
    return this.ai.listConversations(userId);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.ai.getConversation(userId, id);
  }
}
