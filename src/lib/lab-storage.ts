export const LAB_DRAFT_KEY = 'lab_draft';
export const LAB_STEP_KEY = 'lab_step';
export const LAB_DRAFT_USER_KEY = 'lab_draft_user_id';

export const clearLabDraftStorage = () => {
  localStorage.removeItem(LAB_DRAFT_KEY);
  localStorage.removeItem(LAB_STEP_KEY);
  localStorage.removeItem(LAB_DRAFT_USER_KEY);
};