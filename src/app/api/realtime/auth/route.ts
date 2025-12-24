import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/auth-server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  const tokenHeader = req.headers.get("authorization") || "";
  const token = tokenHeader.replace("Bearer ", "");
  const { uid, email } = await authMiddleware(token);

  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);

  const socket_id = params.get("socket_id");
  const channel_name = params.get("channel_name");

  if (!socket_id || !channel_name) {
    return NextResponse.json(
      { error: "Invalid auth payload" },
      { status: 400 }
    );
  }

  const channelData = {
    user_id: String(uid),
    user_info: {
      email,
    },
  };

  const authResponse = pusher.authorizeChannel(
    socket_id,
    channel_name,
    channelData
  );

  return NextResponse.json(authResponse);
}
