import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '@prisma-db/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();

  constructor(private readonly prisma: PrismaService) {}

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (userIds.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, expoPushToken: { not: null } },
      select: { id: true, expoPushToken: true },
    });

    const messages: ExpoPushMessage[] = [];
    const invalidUserIds: string[] = [];
    for (const u of users) {
      const token = u.expoPushToken!;
      if (!Expo.isExpoPushToken(token)) {
        invalidUserIds.push(u.id);
        continue;
      }
      messages.push({
        to: token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      });
    }

    if (invalidUserIds.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: invalidUserIds } },
        data: { expoPushToken: null },
      });
    }

    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        this.logger.warn(`push send failed: ${(err as Error).message}`);
      }
    }
  }

  sendToUser(userId: string, payload: PushPayload) {
    return this.sendToUsers([userId], payload);
  }
}
