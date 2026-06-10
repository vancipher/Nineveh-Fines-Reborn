'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui';
import type { AppRole } from '@/lib/auth/roles';

interface Props {
  allow: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequireRole({ allow, children, redirectTo = '/dashboard' }: Props) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const role = data.user?.role as AppRole | undefined;
        if (role && (allow.includes(role) || role === 'superadmin')) {
          setAllowed(true);
        } else {
          router.replace(redirectTo);
          setAllowed(false);
        }
      })
      .catch(() => {
        router.replace('/login');
        setAllowed(false);
      });
  }, [allow, redirectTo, router]);

  if (allowed !== true) return <LoadingState />;
  return <>{children}</>;
}
