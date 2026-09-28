import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';

export default function SessionStatus() {
  const { loading, sessionError, refreshUser } = useAuth();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      {loading ? (
        <p role="status" className="flex items-center gap-2">
          <Spinner /> Restoring your session...
        </p>
      ) : (
        <Alert className="max-w-md">
          <AlertTitle>Unable to restore your session</AlertTitle>
          <AlertDescription>{sessionError}</AlertDescription>
          <Button className="mt-3" onClick={refreshUser}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        </Alert>
      )}
    </main>
  );
}
