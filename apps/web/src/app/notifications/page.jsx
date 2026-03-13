"use client";

import { Suspense } from "react";
import NotificationsContent from "./notifications-content";

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsContent />
    </Suspense>
  );
}
