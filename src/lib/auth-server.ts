import { getAdminAuth } from "./firebase-admin";

export async function authMiddleware(token?: string | null) {
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (err) {
    console.error("Firebase auth error:", err);
    throw new Error("Unauthorized: Invalid token");
  }
}
