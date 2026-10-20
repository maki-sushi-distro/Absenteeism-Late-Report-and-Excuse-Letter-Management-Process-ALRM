import LoadingSkeleton from '@/components/loading/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import HttpErrorPage from '@/pages/HttpErrorPage';

export default function SessionStatus() {
  const { loading, sessionError, refreshUser } = useAuth();

  if (!loading) {
    return (
      <HttpErrorPage
        status={503}
        description={sessionError}
        onRetry={refreshUser}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <LoadingSkeleton label="Restoring your session..." className="mx-auto max-w-6xl" />
    </main>
  );
}
