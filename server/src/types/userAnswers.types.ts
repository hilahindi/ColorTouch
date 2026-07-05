export type VisualPreference = "minimal" | "vibrant" | "professional" | "playful";
export type ToneOfVoice = "formal" | "casual" | "playful" | "serious";
export type MotionSensitivity = "none" | "mild" | "high";

/**
 * End user's in-app preference questionnaire — distinct from the developer's
 * AppMetadata (app_metadata) which describes the app, not the individual user.
 */
export interface UserAnswers {
  user_id: string;
  visual_preference: VisualPreference;
  tone_of_voice: ToneOfVoice;
  /** Drives ui_behavior.animation_speed — "high" should bias toward reduced_motion. */
  motion_sensitivity: MotionSensitivity;
  /** Free-form descriptors from the questionnaire, e.g. "anxious", "young", "creative". */
  personality_traits: string[];
}
