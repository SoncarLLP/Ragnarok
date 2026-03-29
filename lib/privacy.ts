export type AccountMode = 'public' | 'followers_only' | 'private';
export type VisibilityLevel = 'everyone' | 'followers' | 'nobody';
export type ProfileVisibility = 'everyone' | 'followers' | 'only_me';

export interface PrivacySettings {
  who_can_comment: VisibilityLevel;
  who_can_react: VisibilityLevel;
  who_can_share: VisibilityLevel;
  who_can_follow: 'everyone' | 'nobody';
  show_followers_list: VisibilityLevel;
  show_following_list: VisibilityLevel;
}

export interface ExtendedProfileVisibility {
  personal_details: ProfileVisibility;
  extended_details: ProfileVisibility;
  loyalty_tier: ProfileVisibility;
  order_history: ProfileVisibility;
  community_posts: ProfileVisibility;
  reactions: ProfileVisibility;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  who_can_comment: 'everyone',
  who_can_react: 'everyone',
  who_can_share: 'everyone',
  who_can_follow: 'everyone',
  show_followers_list: 'everyone',
  show_following_list: 'everyone',
};

export const DEFAULT_EXTENDED_VISIBILITY: ExtendedProfileVisibility = {
  personal_details: 'only_me',
  extended_details: 'only_me',
  loyalty_tier: 'only_me',
  order_history: 'only_me',
  community_posts: 'everyone',
  reactions: 'only_me',
};

/** Merge stored JSONB (may be partial/empty) with defaults. */
export function mergePrivacySettings(stored: unknown): PrivacySettings {
  if (typeof stored !== 'object' || stored === null) return { ...DEFAULT_PRIVACY_SETTINGS };
  return { ...DEFAULT_PRIVACY_SETTINGS, ...(stored as Partial<PrivacySettings>) };
}

export function mergeExtendedVisibility(stored: unknown): ExtendedProfileVisibility {
  if (typeof stored !== 'object' || stored === null) return { ...DEFAULT_EXTENDED_VISIBILITY };
  return { ...DEFAULT_EXTENDED_VISIBILITY, ...(stored as Partial<ExtendedProfileVisibility>) };
}

/**
 * Given a viewer's relationship to a profile owner, determine if the viewer
 * can see content at the given ProfileVisibility level.
 */
export function canView(
  visibility: ProfileVisibility,
  opts: { isOwner: boolean; isFollower: boolean; isAdmin: boolean }
): boolean {
  if (opts.isOwner || opts.isAdmin) return true;
  if (visibility === 'everyone') return true;
  if (visibility === 'followers') return opts.isFollower;
  return false; // 'only_me'
}

/** Human-readable labels for UI dropdowns */
export const VISIBILITY_LABELS: Record<VisibilityLevel, string> = {
  everyone: 'Everyone',
  followers: 'Followers only',
  nobody: 'Nobody',
};
export const PROFILE_VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  everyone: 'Everyone',
  followers: 'Followers only',
  only_me: 'Only me',
};
export const ACCOUNT_MODE_LABELS: Record<AccountMode, string> = {
  public: 'Public',
  followers_only: 'Followers only',
  private: 'Private',
};
export const FOLLOW_LABELS = { everyone: 'Everyone', nobody: 'Nobody' };
