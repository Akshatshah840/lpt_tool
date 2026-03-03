import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRealAuth } from '@/hooks/useRealAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/pages/auth/AuthPage';
import { ProfileSetup } from '@/pages/auth/ProfileSetup';

import { AppAdminDashboard } from '@/pages/app-admin/Dashboard';
import { AppAdminProjects } from '@/pages/app-admin/Projects';
import { AppAdminUsers } from '@/pages/app-admin/Users';
import { AppAdminAllResults } from '@/pages/app-admin/AllResults';

import { ProjectAdminDashboard } from '@/pages/project-admin/Dashboard';
import { ProjectAdminProjectsManager } from '@/pages/project-admin/ProjectsManager';
import { ProjectAdminProjectUsers } from '@/pages/project-admin/ProjectUsers';
import { ProjectAdminResultDetail } from '@/pages/project-admin/ResultDetail';
import { ProjectAdminTranscribers } from '@/pages/project-admin/Transcribers';
import { ProjectAdminTests } from '@/pages/project-admin/Tests';
import { ProjectAdminTestDetail } from '@/pages/project-admin/TestDetail';
import { ProjectAdminAudioAssets } from '@/pages/project-admin/AudioAssets';

import { TranscriberDashboard } from '@/pages/transcriber/Dashboard';
import { TranscriberTakeTest } from '@/pages/transcriber/TakeTest';
import { TranscriberMyResults } from '@/pages/transcriber/MyResults';
import { TranscriberResultDetail } from '@/pages/transcriber/ResultDetail';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { authStatus, signOut } = useAuthenticator(ctx => [ctx.authStatus, ctx.signOut]);
  const { role, isLoading, userId, userEmail, userName } = useRealAuth();
  const { preferredLanguage, setLanguage, loading: profileLoading } = useUserProfile(
    role === 'TRANSCRIBERS' ? userId : null
  );

  if (authStatus === 'configuring' || isLoading) return <LoadingScreen />;
  if (authStatus !== 'authenticated') return <AuthPage />;

  // Only transcribers need to choose their language before proceeding
  if (role === 'TRANSCRIBERS' && !profileLoading && !preferredLanguage) {
    return <ProfileSetup userName={userName} onComplete={setLanguage} />;
  }

  if (role === 'APP_ADMINS') {
    return (
      <AppLayout role={role} userName={userName} userEmail={userEmail} onSignOut={signOut}>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AppAdminDashboard />} />
          <Route path="/admin/projects"  element={<AppAdminProjects />} />
          <Route path="/admin/users"     element={<AppAdminUsers />} />
          <Route path="/admin/results"   element={<AppAdminAllResults />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </AppLayout>
    );
  }

  if (role === 'PROJECT_ADMINS') {
    return (
      <AppLayout role={role} userName={userName} userEmail={userEmail} onSignOut={signOut}>
        <Routes>
          <Route path="/" element={<Navigate to="/project/dashboard" replace />} />
          <Route path="/project/dashboard"            element={<ProjectAdminDashboard />} />
          <Route path="/project/projects"             element={<ProjectAdminProjectsManager />} />
          <Route path="/project/projects/:projectId"  element={<ProjectAdminProjectUsers />} />
          <Route path="/project/results/:resultId"    element={<ProjectAdminResultDetail />} />
          <Route path="/project/transcribers"         element={<ProjectAdminTranscribers />} />
          <Route path="/project/tests"                element={<ProjectAdminTests />} />
          <Route path="/project/tests/:testId"        element={<ProjectAdminTestDetail />} />
          <Route path="/project/audio-assets"         element={<ProjectAdminAudioAssets />} />
          <Route path="*" element={<Navigate to="/project/dashboard" replace />} />
        </Routes>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="TRANSCRIBERS" userName={userName} userEmail={userEmail} onSignOut={signOut}>
      <Routes>
        <Route path="/" element={<Navigate to="/transcriber/dashboard" replace />} />
        <Route path="/transcriber/dashboard"    element={<TranscriberDashboard userId={userId} userLanguage={preferredLanguage} />} />
        <Route path="/transcriber/test/:testId" element={<TranscriberTakeTest userId={userId} userName={userName} userEmail={userEmail} />} />
        <Route path="/transcriber/results"      element={<TranscriberMyResults userId={userId} />} />
        <Route path="/transcriber/result/:resultId" element={<TranscriberResultDetail />} />
        <Route path="*" element={<Navigate to="/transcriber/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
