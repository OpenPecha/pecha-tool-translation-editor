// Global type definition for Umami
declare global {
  interface Window {
    umami?: {
      track: (
        event: string,
        properties?: Record<string, string | number | boolean | null>
      ) => void;
      identify: (
        userId: string,
        properties?: Record<string, string | number | boolean | null>
      ) => void;
    };
  }
}

// User interface for identification
interface UmamiUser {
  email?: string;
  id?: string;
  sub?: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
}

// Global user state for identification
let currentUser: UmamiUser | null = null;

// Queue for user identification when Umami is not yet loaded
let identificationQueue: (() => void)[] = [];

export function injectUmami() {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  const umamiSrc = import.meta.env.VITE_UMAMI_SRC;

  if (websiteId && umamiSrc) {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.websiteId = websiteId;
    script.src = umamiSrc;

    // Add onload handler to identify user once Umami is loaded
    script.onload = () => {
      console.log("🔍 Umami script loaded");

      // Identify current user if available
      if (currentUser) {
        identifyUserInUmami(currentUser);
      }

      // Process any queued identifications
      identificationQueue.forEach((fn) => fn());
      identificationQueue = [];
    };

    document.head.appendChild(script);
  }
}

// Function to identify user in Umami
function identifyUserInUmami(user: UmamiUser) {
  if (!window.umami?.identify) return;

  const userId = user.email || user.id || user.sub;
  if (!userId) return;

  const userProperties: Record<string, string | number | boolean> = {
    identified_at: Date.now(),
  };

  // Add available user properties
  if (user.email) userProperties.email = user.email;
  if (user.name) userProperties.name = user.name;
  if (user.role) userProperties.role = user.role;
  if (user.isAdmin !== undefined) userProperties.isAdmin = user.isAdmin;

  // window.umami.identify(userId, userProperties);
}

// Public function to set user for identification
export function setUmamiUser(user: UmamiUser | null) {
  currentUser = user;

  if (user) {
    if (window.umami?.identify) {
      // Umami is already loaded, identify immediately
      identifyUserInUmami(user);
    } else {
      // Umami not loaded yet, queue the identification
      identificationQueue.push(() => identifyUserInUmami(user));
    }
  }
}

// Function to get current user
export function getCurrentUmamiUser(): UmamiUser | null {
  return currentUser;
}

// Function to clear user identification
export function clearUmamiUser() {
  currentUser = null;
  // Note: Umami doesn't have a built-in way to "un-identify" a user
  // The identification persists for the session
}
