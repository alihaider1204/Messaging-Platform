// Shared WhatsApp-style green app bar so sidebar + chat headers match pixel-for-pixel
export const CHAT_APP_BAR_PX = 59;

export const chatAppBarSx = {
  flexShrink: 0,
  height: CHAT_APP_BAR_PX,
  minHeight: CHAT_APP_BAR_PX,
  maxHeight: CHAT_APP_BAR_PX,
  boxSizing: 'border-box',
  px: 2,
  py: 0,
  display: 'flex',
  alignItems: 'center',
  borderBottom: 1,
  borderColor: 'divider',
  bgcolor: '#075E54',
  color: 'white',
};
