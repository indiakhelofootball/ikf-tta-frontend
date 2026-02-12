// src/components/error/TestErrorButton.jsx
// USE THIS ONLY IN DEVELOPMENT TO TEST ERROR BOUNDARIES

import { useState } from 'react';
import { Button, Stack, Typography, Paper } from '@mui/material';
import { BugReport as BugIcon } from '@mui/icons-material';

function TestErrorButton() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [errorType, setErrorType] = useState(null);

  // This will trigger error boundary
  if (shouldThrow) {
    if (errorType === 'render') {
      throw new Error('🧪 Test Render Error - This is intentional!');
    }
  }

  // Async error example (won't be caught by error boundary)
  const throwAsyncError = async () => {
    setTimeout(() => {
      throw new Error('🧪 Async Error - Error boundaries dont catch these!');
    }, 100);
  };

  // Event handler error (won't be caught by error boundary)
  const throwEventError = () => {
    throw new Error('🧪 Event Error - Error boundaries dont catch these!');
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: '#fef3c7',
        borderColor: '#fbbf24',
        borderWidth: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <BugIcon color="warning" />
          <Typography variant="subtitle2" fontWeight={600}>
            Error Boundary Testing (Dev Only)
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Click these buttons to test error boundaries:
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {/* This WILL be caught by error boundary */}
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => {
              setErrorType('render');
              setShouldThrow(true);
            }}
          >
            ✅ Throw Render Error
          </Button>

          {/* This will NOT be caught by error boundary */}
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={throwEventError}
          >
            ❌ Throw Event Error
          </Button>

          {/* This will NOT be caught by error boundary */}
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={throwAsyncError}
          >
            ❌ Throw Async Error
          </Button>
        </Stack>

        <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
          ✅ = Caught by error boundary | ❌ = Not caught (check console)
        </Typography>
      </Stack>
    </Paper>
  );
}

export default TestErrorButton;