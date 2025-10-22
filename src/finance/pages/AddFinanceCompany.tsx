// src/finance/pages/AddFinanceCompany.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Grid, TextField, InputLabel, Button, Box, Snackbar, Alert, Paper, Typography, Card, CardContent } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import MainCard from 'components/MainCard';
import { createFinanceCompany, updateFinanceCompany, getLocalStamp } from '../api/FinanceCompanyEndPoints';
import { mutate } from 'swr';
import { IFinanceCompany } from '../types/IFinanceCompany';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFinanceCompanyStore } from '../stores/financeCompanyStore';
import { useShowroom } from 'access/contexts/showRoomContext';
import { CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons';
import useAuth from 'access/hooks/useAuth';
import { ImageOutlined } from '@mui/icons-material';

// Zod schema for validation
const financeCompanySchema = z.object({
  companyName: z.string().min(1, '✍️ Company Name is required!'),
  stampFile: z.any().optional()
});

type FormData = z.infer<typeof financeCompanySchema>;

const AddFinanceCompany: React.FC = () => {
  // eslint-disable-next-line no-empty-pattern
  const {} = useFinanceCompanyStore();
  const { currentShowroom } = useShowroom();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyData = null, isEditMode = false } = location.state || {};

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCompanyValues: Partial<IFinanceCompany> = {
    id: null,
    companyName: '',
    stampPath: '',
    showroomId: currentShowroom?.showroomId || '',
    isDeleted: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
    createdBy: user?.username || 'system',
    modifiedBy: user?.username || 'system'
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(financeCompanySchema),
    defaultValues: {
      companyName: companyData?.companyName || '',
      stampFile: null
    }
  });

  useEffect(() => {
    if (companyData) {
      reset({
        companyName: companyData.companyName || ''
      });

      // Load stamp from local storage if available
      if (companyData.stampPath && currentShowroom?.showroomName) {
        getLocalStamp(companyData.companyName, currentShowroom.showroomName).then((stampData) => {
          if (stampData) {
            setStampPreview(stampData);
          }
        });
      }
    }
  }, [companyData, reset, currentShowroom]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg') {
        setStampFile(file);
        setValue('stampFile', file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setStampPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  const handleRemoveStamp = () => {
    setStampFile(null);
    setStampPreview(null);
    setValue('stampFile', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      if (!currentShowroom?.showroomId) {
        alert('No showroom selected. Please select a showroom before proceeding.');
        setIsSubmitting(false);
        return;
      }

      const companyFormData: Partial<IFinanceCompany> = {
        companyName: data.companyName,
        showroomId: currentShowroom.showroomId,
        createdBy: user?.username || 'system',
        modifiedBy: user?.username || 'system'
      };

      if (isEditMode && companyData?.id) {
        // Update existing company
        await updateFinanceCompany(
          companyData.id,
          companyFormData,
          stampFile || (stampPreview ? undefined : undefined),
          currentShowroom.showroomId,
          currentShowroom.showroomName
        );

        // Revalidate the cache and wait for it
        await mutate(['financeCompanies', currentShowroom.showroomId]);

        // Show success message
        setOpenSnackbar(true);

        // Navigate after a short delay to ensure cache is updated
        setTimeout(() => {
          navigate('/finance/list');
        }, 500);
      } else {
        // Create new company
        if (!stampFile && !stampPreview) {
          alert('Please upload a stamp image');
          setIsSubmitting(false);
          return;
        }

        await createFinanceCompany(companyFormData, stampFile || stampPreview!, currentShowroom.showroomId, currentShowroom.showroomName);

        // Revalidate the cache and wait for it
        await mutate(['financeCompanies', currentShowroom.showroomId]);

        // Show success message
        setOpenSnackbar(true);

        // For create mode, reset form and stay on page
        reset(defaultCompanyValues);
        handleRemoveStamp();
      }
    } catch (error) {
      console.error(isEditMode ? 'Error updating finance company:' : 'Error creating finance company:', error);
      alert(isEditMode ? 'Failed to update finance company' : 'Failed to create finance company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  const formTitle = isEditMode ? 'Edit Finance Company' : 'Add Finance Company';

  return (
    <div>
      {!currentShowroom?.showroomId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please select a showroom before saving the finance company.
        </Alert>
      )}
      <h4
        style={{
          margin: 0,
          marginBottom: '16px',
          fontWeight: 600,
          fontSize: '1.25rem',
          lineHeight: 1.4,
          fontFamily: 'Poppins, sans-serif',
          color: '#009688'
        }}
      >
        {formTitle}
      </h4>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <MainCard>
              <Grid container spacing={2}>
                <Snackbar
                  open={openSnackbar}
                  autoHideDuration={3000}
                  onClose={handleCloseSnackbar}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <Alert onClose={handleCloseSnackbar} severity="success" variant="filled" sx={{ width: '100%' }}>
                    {isEditMode ? 'Finance Company Updated Successfully!' : 'Finance Company Created Successfully!'}
                  </Alert>
                </Snackbar>

                {/* Company Name */}
                <Grid item xs={12}>
                  <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Company Name</InputLabel>
                  <Controller
                    name="companyName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        error={!!errors.companyName}
                        helperText={errors.companyName?.message}
                        placeholder="Enter Finance Company Name"
                        fullWidth
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>

                {/* Stamp Upload */}
                <Grid item xs={12}>
                  <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Company Stamp</InputLabel>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isSubmitting}
                  />

                  {!stampPreview ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        cursor: isSubmitting ? 'default' : 'pointer',
                        backgroundColor: 'grey.50',
                        '&:hover': {
                          backgroundColor: isSubmitting ? 'grey.50' : 'grey.100'
                        },
                        opacity: isSubmitting ? 0.6 : 1
                      }}
                      onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    >
                      <CloudUploadOutlined style={{ fontSize: 48, color: '#009688' }} />
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        Click to upload stamp image
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Supported formats: PNG, JPG, JPEG
                      </Typography>
                    </Paper>
                  ) : (
                    <Card>
                      <CardContent>
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={stampPreview}
                            alt="Stamp Preview"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '200px',
                              objectFit: 'contain'
                            }}
                          />
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              startIcon={<ImageOutlined />}
                              onClick={() => fileInputRef.current?.click()}
                              size="small"
                              disabled={isSubmitting}
                            >
                              Change
                            </Button>
                            {!isEditMode && (
                              <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteOutlined />}
                                onClick={handleRemoveStamp}
                                size="small"
                                disabled={isSubmitting}
                              >
                                Remove
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Note: Stamps are stored locally on your system
                  </Typography>
                </Grid>
              </Grid>
            </MainCard>

            <Box display="flex" justifyContent="flex-end" alignItems="center" mt={1.5}>
              <Button variant="outlined" onClick={() => navigate('/finance/list')} sx={{ mr: 1 }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="contained"
                type="submit"
                disabled={isSubmitting}
                sx={{
                  backgroundColor: 'farmer.lighter',
                  '&:hover': {
                    backgroundColor: 'farmer.light'
                  }
                }}
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
              </Button>
            </Box>
          </Grid>

          {/* Preview Section */}
          <Grid item xs={12} md={6}>
            <MainCard title="Stamp Preview">
              {stampPreview ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '300px',
                    backgroundColor: 'grey.50',
                    borderRadius: 1,
                    p: 2
                  }}
                >
                  <img
                    src={stampPreview}
                    alt="Stamp Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '300px',
                    backgroundColor: 'grey.50',
                    borderRadius: 1
                  }}
                >
                  <Typography color="textSecondary">No stamp uploaded yet</Typography>
                </Box>
              )}
            </MainCard>
          </Grid>
        </Grid>
      </form>
    </div>
  );
};

export default AddFinanceCompany;
