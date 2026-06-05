import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    
    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Something went wrong during logout" },
      { status: 500 }
    );
  }
}
