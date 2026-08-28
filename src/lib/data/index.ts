import { Repository } from "./repository";
import { DataError, Session } from "./types";

const API_URL = "/api/v1";

export const repo = new Proxy({} as Repository, {
  get(_target, prop) {
    if (prop === "auth") {
      return {
        signIn: async (email: string, password: string) => {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
              throw new DataError("EMAIL_NOT_VERIFIED", data.message);
            }
            if (res.status === 423) {
              throw new DataError("ACCOUNT_LOCKED", data.message);
            }
            if (res.status === 401) {
              throw new DataError("INVALID_CREDENTIALS", "Email or Password is wrong");
            }
            throw new Error(data.message || "Failed to sign in");
          }
          
          return {
            userId: data.userId,
            email: email,
            roles: ["player"], // Defaults to player for now
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          };
        },
        signUp: async (email: string, password: string, username: string) => {
          const res = await fetch(`${API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, username, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (data.message === 'Email or Username already taken') {
              throw new DataError("EMAIL_TAKEN", data.message);
            }
            throw new Error(data.message || "Failed to sign up");
          }
          // The backend sends OTP on signup and returns null for session initially
          return null;
        },
        verifyEmail: async (email: string, otp: string) => {
          // We need userId for verify-otp in backend. In the real flow, the frontend 
          // usually tracks the current registering user. For now, we will query via email.
          // Wait, our backend requires userId! We must update the backend to allow verification via email + otp instead of userId + otp, because frontend only knows the email!
          
          const res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, otp }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new DataError("VALIDATION_FAILED", data.message || "Invalid OTP");
          }
          
          const session: Session = {
            userId: data.userId || 'new-user',
            email: email,
            roles: ["player"],
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          };
          
          return session;
        },
        signOut: async () => {
          await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
        },
        getSession: async () => {
          try {
            const res = await fetch(`${API_URL}/auth/me`, { method: "GET", credentials: "include" });
            if (!res.ok) return null;
            const data = await res.json();
            return data.session;
          } catch (e) {
            return null;
          }
        },
        onAuthStateChange: () => () => {},
        signInWithProvider: async () => { throw new Error("Backend removed"); },
        checkUsername: async (username: string) => {
          const res = await fetch(`${API_URL}/auth/check-username?username=${encodeURIComponent(username)}`, { credentials: "include" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to check username");
          return data.available as boolean;
        },
        resendVerification: async (email: string) => {
          const res = await fetch(`${API_URL}/auth/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to resend OTP");
          }
        },
        requestPasswordReset: async (email: string) => {
          const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to request password reset");
          }
        },
        resetPassword: async (email: string, otp: string, newPassword: string) => {
          const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, otp, newPassword }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 400 && data.message.includes("Invalid OTP")) {
              throw new DataError("VALIDATION_FAILED", data.message);
            }
            if (res.status === 400 && data.message.includes("invalidated")) {
              throw new DataError("VALIDATION_FAILED", data.message);
            }
            if (res.status === 400 && data.message.includes("expired")) {
              throw new DataError("VALIDATION_FAILED", data.message);
            }
            throw new Error(data.message || "Failed to reset password");
          }
        },
      };
    }
    if (prop === "profiles") {
      return {
        get: async (userId: string) => {
          const res = await fetch(`${API_URL}/profile/${userId}`, { credentials: "include" });
          if (!res.ok) return null;
          return await res.json();
        },
        update: async (userId: string, data: any) => {
          const res = await fetch(`${API_URL}/profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new DataError("VALIDATION_FAILED", err.message || "Failed to update profile");
          }
          return await res.json();
        }
      };
    }

    if (prop === "payments") {
      return {
        create: async (userId: string, formData: FormData) => {
          const res = await fetch(`${API_URL}/payment`, {
            method: "POST",
            credentials: "include",
            body: formData, // Do not set Content-Type header; browser will boundary it
          });
          if (!res.ok) {
            const err = await res.json();
            throw new DataError("VALIDATION_FAILED", err.message || "Failed to submit payment");
          }
          return await res.json();
        }
      };
    }

    if (prop === "characters") {
      return {
        getByUser: async (userId: string) => {
          const res = await fetch(`${API_URL}/character/${userId}`, { credentials: "include" });
          if (!res.ok) return null;
          return await res.json();
        },
        update: async (userId: string, data: any) => {
          const res = await fetch(`${API_URL}/character`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new DataError("VALIDATION_FAILED", err.message || "Failed to update character");
          }
          return await res.json();
        },
        isPlayerNameTaken: async (playerName: string, excludeUserId?: string) => {
          const query = new URLSearchParams({ name: playerName });
          if (excludeUserId) query.set("excludeUserId", excludeUserId);
          const res = await fetch(`${API_URL}/character/check-name?${query.toString()}`, { credentials: "include" });
          if (!res.ok) return true; // fail safe
          const data = await res.json();
          return data.taken;
        }
      };
    }

    if (prop === "reference") {
      return {
        categories: async () => {
          const res = await fetch(`${API_URL}/reference/categories`, { credentials: "include" });
          if (!res.ok) return [];
          return await res.json();
        },
        colleges: async () => {
          const res = await fetch(`${API_URL}/reference/colleges`, { credentials: "include" });
          if (!res.ok) return [];
          return await res.json();
        },
        departments: async (collegeId: string | null) => {
          const res = await fetch(`${API_URL}/reference/departments${collegeId ? `?collegeId=${collegeId}` : ''}`, { credentials: "include" });
          if (!res.ok) return [];
          return await res.json();
        },
        validateReferral: async (code: string) => {
          const res = await fetch(`${API_URL}/reference/validate-referral?code=${encodeURIComponent(code)}`, { credentials: "include" });
          if (!res.ok) return { valid: false };
          return await res.json();
        },
        levels: async () => []
      };
    }

    if (prop === "paymentReceipts") {
      return {
        getByUser: async (userId: string) => {
          const res = await fetch(`${API_URL}/payment`, { credentials: "include" });
          if (!res.ok) return null;
          const data = await res.json();
          return data ? data : null;
        }
      };
    }
    if (prop === "registrations") {
      return {
        register: async (eventId: string, userId: string, teamId?: string) => {
          const res = await fetch(`${API_URL}/registrations/individual`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ eventId }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new DataError("VALIDATION_FAILED", data.message || "Failed to register");
          }
          return data;
        },
        listForUser: async (userId: string) => {
          const res = await fetch(`${API_URL}/registrations`, {
            credentials: "include",
          });
          if (!res.ok) return [];
          const data = await res.json();
          // Transform to match frontend Registration type
          return data.map((r: any) => ({
            id: r.registration_id,
            eventId: r.event_slug,
            userId: userId,
            teamId: r.team_id ? String(r.team_id) : null,
            teamName: r.team_name,
            teamMemberCount: r.team_member_count,
            teamCode: r.team_code,
            status: r.status,
            createdAt: r.created_at
          }));
        },
        cancel: async (registrationId: string, action?: "leave" | "disband") => {
          const res = await fetch(`${API_URL}/registrations/${registrationId}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ action: action || "leave" }),
          });
          const data = await res.json();
          if (!res.ok) throw new DataError("VALIDATION_FAILED", data.message || "Failed to cancel registration");
        }
      };
    }
    
    if (prop === "teams") {
      return {
        create: async (eventId: string, userId: string, name: string) => {
          const res = await fetch(`${API_URL}/registrations/teams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ eventId, teamName: name }),
          });
          const data = await res.json();
          if (!res.ok) throw new DataError("VALIDATION_FAILED", data.message || "Failed to create team");
          return data;
        },
        join: async (joinCode: string, userId: string) => {
          // Note: the original UI provides joinCode. We might also need eventId for join. 
          // However, the join api we wrote expects `eventId` and `joinCode`.
          // The frontend `repo.teams.join` signature in `types.ts`/`repository.ts` is `join(joinCode, userId)`.
          // Wait! Our backend needs `eventId`.
          const res = await fetch(`${API_URL}/registrations/teams/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ joinCode }), // We will fix backend to not require eventId, or fetch eventId from DB based on joinCode
          });
          const data = await res.json();
          if (!res.ok) throw new DataError("VALIDATION_FAILED", data.message || "Failed to join team");
          return data;
        },
        listForUser: async () => [],
        members: async (teamId: string) => {
          const res = await fetch(`${API_URL}/registrations/teams/${teamId}/members`, {
            credentials: "include",
          });
          if (!res.ok) return [];
          return await res.json();
        },
        removeMember: async (teamId: string, targetUserId: string) => {
          const res = await fetch(`${API_URL}/registrations/teams/${teamId}/remove/${targetUserId}`, {
            method: "POST",
            credentials: "include",
          });
          const data = await res.json();
          if (!res.ok) throw new DataError("VALIDATION_FAILED", data.message || "Failed to remove member");
        },
      };
    }

    // Return a dummy object where any method called returns an empty array/null
    return new Proxy({}, {
      get(_t, method) {
        if (method === "subscribe") return () => () => {};
        
        return async () => {
          if (method === "stats") return { confirmedCount: 0, waitlistCount: 0, checkedInCount: 0, capacity: 100, seatsLeft: 100 };
          if (method === "top") return [];
          if (method === "list" || method === "listForEvent") return [];
          if (method === "schedule") return [];
          if (method === "categories" || method === "colleges" || method === "departments" || method === "sponsors" || method === "levels") return [];
          return null;
        };
      }
    });
  },
});

export * from "./types";
export type { Repository } from "./repository";
export const isApiBackendEnabled = true;
export function xpProgress(xp?: number, levels?: any[]) { return { level: 1, title: "Wanderer", current: 0, required: 100 }; }
