import React from 'react';
import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/ui';
import { AppScreen } from '@/components/AppScreen';
import { useAuth } from '@/auth/AuthContext';
export default function Index() { const { user, loading } = useAuth(); if (loading) return <AppScreen scroll={false}><LoadingState label="Opening AcademiaOS…" /></AppScreen>; if (!user) return <Redirect href="/login" />; if (user.mustChangePassword) return <Redirect href="/change-password" />; return <Redirect href="/(tabs)/home" />; }
