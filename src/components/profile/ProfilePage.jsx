// src/components/profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Alert,
  Snackbar,
  Paper,
} from '@mui/material';
import {
  PhotoCamera,
  Save as SaveIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    email: '',
    phone: '',
    department: '',
    location: '',
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Load saved profile data (per-user key matches AuthContext)
  useEffect(() => {
    if (!user?.email) return;
    const profileKey = `tta_profile_${user.email}`;
    const savedProfile = localStorage.getItem(profileKey);
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setFormData({
        name: profile.name || '',
        designation: profile.designation || '',
        email: user.email,
        phone: profile.phone || '',
        department: profile.department || '',
        location: profile.location || '',
      });
      if (profile.profileImage) {
        setImagePreview(profile.profileImage);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email,
      }));
    }
  }, [user]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setToast({
          open: true,
          message: 'Image size should be less than 2MB',
          severity: 'error',
        });
        return;
      }

      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Prepare profile data
      const profileData = {
        ...formData,
        profileImage: imagePreview,
        updatedAt: new Date().toISOString(),
      };

      // Save to localStorage (per-user key matches AuthContext)
      const profileKey = `tta_profile_${user.email}`;
      localStorage.setItem(profileKey, JSON.stringify(profileData));

      // Update auth context
      if (updateUserProfile) {
        updateUserProfile(profileData);
      }

      setToast({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      setToast({
        open: true,
        message: 'Failed to save profile',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (formData.name) {
      return formData.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (formData.email) {
      return formData.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#111827' }}>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your personal information and preferences
        </Typography>
      </Box>

      {/* Profile Card */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid #E5E7EB',
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Profile Image Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 4 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={imagePreview}
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: '#FBBF24',
                  color: '#111827',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  border: '4px solid white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                {!imagePreview && getInitials()}
              </Avatar>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="profile-image-upload"
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="profile-image-upload">
                <IconButton
                  component="span"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: '#FBBF24',
                    color: '#111827',
                    '&:hover': {
                      bgcolor: '#F59E0B',
                    },
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <PhotoCamera />
                </IconButton>
              </label>
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {formData.name || 'Your Name'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formData.designation || 'Your Designation'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Click the camera icon to upload a profile picture (max 2MB)
              </Typography>
            </Box>
          </Box>

          {/* Form Fields */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange('name')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Designation"
                placeholder="e.g., Field REP, Admin Manager"
                value={formData.designation}
                onChange={handleChange('designation')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                disabled
                InputLabelProps={{ shrink: true }}
                helperText="Email cannot be changed"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange('phone')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                placeholder="e.g., Operations, Management"
                value={formData.department}
                onChange={handleChange('department')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                placeholder="e.g., Mumbai, Delhi"
                value={formData.location}
                onChange={handleChange('location')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                px: 4,
                py: 1.5,
                background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                color: '#111827',
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': {
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Role Info */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid #E5E7EB',
          borderRadius: 2,
          bgcolor: '#F9FAFB',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonIcon sx={{ color: '#6B7280' }} />
          <Box>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              Account Role
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.role || 'User'} • This cannot be changed
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}