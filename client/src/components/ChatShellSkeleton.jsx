import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { chatAppBarSx } from '../chatAppBar';

/** Right pane while sidebar is still fetching users/chats (after login) */
export default function ChatShellSkeleton({ showBackSkeleton }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', bgcolor: '#ece5dd' }}>
      <Box sx={{ ...chatAppBarSx, gap: showBackSkeleton ? 1 : 1.5 }}>
        {showBackSkeleton && (
          <Skeleton variant="rounded" width={34} height={34} sx={{ bgcolor: 'rgba(255,255,255,0.28)', flexShrink: 0 }} />
        )}
        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.35)' }} />
        <Skeleton variant="rounded" height={22} sx={{ bgcolor: 'rgba(255,255,255,0.35)', flex: 1, maxWidth: 200 }} />
      </Box>

      <Box sx={{ flex: 1, p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ alignSelf: i % 2 ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
            <Skeleton variant="rounded" width={220 - i * 30} height={44} sx={{ bgcolor: '#d4cdc4', borderRadius: 2 }} />
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: '#f0f0f0' }}>
        <Skeleton variant="rounded" height={40} sx={{ bgcolor: '#e8e8e8', borderRadius: 2 }} />
      </Box>
    </Box>
  );
}
