// Utility functions for Crisp chat session management

declare global {
  interface Window {
    $crisp?: any
    CRISP_WEBSITE_ID?: string
  }
}

/**
 * Reset Crisp chat session - clears all user data and chat history
 * This ensures that when a new user logs in, they don't see previous user's chat
 */
export function resetCrispSession() {
  if (typeof window !== 'undefined' && window.$crisp) {
    try {
      // Reset session to clear all chat history and user data
      window.$crisp.push(['do', 'session:reset'])
      // Clear user email
      window.$crisp.push(['set', 'user:email', ''])
      // Clear user nickname
      window.$crisp.push(['set', 'user:nickname', ''])
      // Clear session data
      window.$crisp.push(['set', 'session:data', []])
      // Hide chat widget
      window.$crisp.push(['do', 'chat:hide'])
    } catch (error) {
      console.error('Error resetting Crisp session:', error)
    }
  }
}

/**
 * Set Crisp user data for the current logged-in user
 * This ensures each user has their own separate chat session
 */
export function setCrispUserData(userId: number, email: string, name?: string, role?: string) {
  if (typeof window !== 'undefined' && window.$crisp) {
    try {
      // Reset session first to ensure clean state
      window.$crisp.push(['do', 'session:reset'])
      
      // Set user email (required for Crisp to identify user)
      window.$crisp.push(['set', 'user:email', email])
      
      // Set user nickname if provided
      if (name) {
        window.$crisp.push(['set', 'user:nickname', name])
      }
      
      // Set session data with user ID to ensure separation
      window.$crisp.push(['set', 'session:data', [
        ['user_id', userId.toString()],
        ['user_email', email],
        ['user_name', name || ''],
        ['user_role', role || 'user']
      ]])
      
      // Hide chat widget by default
      window.$crisp.push(['do', 'chat:hide'])
    } catch (error) {
      console.error('Error setting Crisp user data:', error)
    }
  }
}

