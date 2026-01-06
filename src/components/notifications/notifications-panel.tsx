"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Package,
  CreditCard,
  Star,
  MessageSquare,
  Settings,
  CheckCheck,
  Trash2,
  ShoppingCart
} from "lucide-react";
import { useNotificationsStore, Notification, NotificationType } from "@/lib/notifications-store";
import { useAuthStore } from "@/lib/auth-store";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order_status':
      return <Package className="w-4 h-4 text-blue-500" />;
    case 'order_new':
      return <ShoppingCart className="w-4 h-4 text-green-500" />;
    case 'payment':
      return <CreditCard className="w-4 h-4 text-green-600" />;
    case 'review':
      return <Star className="w-4 h-4 text-yellow-500" />;
    case 'message':
      return <MessageSquare className="w-4 h-4 text-purple-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

const getNotificationLink = (notification: Notification, userRole: string) => {
  if (notification.orderId) {
    if (userRole === 'vendor') {
      return `/vendor?tab=orders`;
    }
    return `/buyer/dashboard?tab=orders`;
  }
  if (notification.productId) {
    return `/product/${notification.productId}`;
  }
  return null;
};

export function NotificationsPanel() {
  const { user } = useAuthStore();
  const {
    getNotificationsByUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotificationsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !user) {
    return (
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="w-5 h-5" />
      </Button>
    );
  }

  const notifications = getNotificationsByUser(user.id);
  const unreadCount = getUnreadCount(user.id);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllAsRead(user.id)}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification, user.role);

                const notificationContent = (
                  <div className="flex gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                          {notification.title}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {notification.channels.includes('email') && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Email sent
                          </Badge>
                        )}
                        {notification.channels.includes('sms') && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            SMS sent
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );

                return link ? (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-3 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    asChild
                  >
                    <Link href={link}>
                      {notificationContent}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-3 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notificationContent}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => clearAllNotifications(user.id)}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                asChild
              >
                <Link href="/settings/notifications">
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
