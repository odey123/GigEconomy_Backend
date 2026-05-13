import { Notification, type INotificationDocument } from '../models';
import { NotFoundError } from '../utils/errors';

export interface CreateNotificationDTO {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationResponseDTO {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data: CreateNotificationDTO): Promise<NotificationResponseDTO> {
    const notification = await Notification.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      isRead: false,
    });

    return this.formatNotificationResponse(notification);
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: NotificationResponseDTO[]; unread: number; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { userId };

    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications: notifications.map((n) => this.formatNotificationResponse(n)),
      unread: unreadCount,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationResponseDTO> {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    return this.formatNotificationResponse(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const result = await Notification.findByIdAndDelete(notificationId);
    if (!result) {
      throw new NotFoundError('Notification');
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<NotificationResponseDTO[]> {
    const notifications = await Notification.insertMany(
      userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
      }))
    );

    return notifications.map((n) => this.formatNotificationResponse(n as INotificationDocument));
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  /**
   * Format notification response
   */
  private formatNotificationResponse(notification: INotificationDocument): NotificationResponseDTO {
    return {
      _id: notification._id.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt!,
    };
  }
}

export default new NotificationService();
