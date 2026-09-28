import { Spinner } from '@/components/ui/spinner';
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
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <p role="status" className="flex items-center gap-2">
        <Spinner /> Restoring your session...
      </p>
    </main>
  );
}
