import { checkAndNotifyDeadlines } from "@/lib/notifications"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const notificationCount = await checkAndNotifyDeadlines()

    return NextResponse.json({
      success: true,
      message: `Checked deadlines and sent ${notificationCount} notifications`,
    })
  } catch (error) {
    console.error("Error checking deadlines:", error)
    return NextResponse.json({ success: false, error: "Failed to check deadlines" }, { status: 500 })
  }
}
