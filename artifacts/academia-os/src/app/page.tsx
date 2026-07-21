import { LoginScreen } from '@/components/LoginScreen';
import { currentUser } from '@/lib/auth';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const showDemo = process.env.ACADEMIAOS_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true';
  return <LoginScreen error={params.error} showDemo={showDemo} user={user}/>;
}
