'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { env } from '@/lib/env';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ email: string; role: string; companyName: string } | null>(null);
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const baseUrl = env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        const res = await fetch(`${baseUrl}/invites/validate/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || 'Invalid or expired invitation.');
        }
        setInvite(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not validate invitation.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const baseUrl = env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/invites/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, phoneNumber }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Could not accept invitation.');
      }
      router.push('/login?invited=1');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Accept failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Validating invitation…</p>;
  }

  if (error && !invite) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mt-16 p-6 bg-white rounded-xl border shadow-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Join {invite?.companyName}</h1>
        <p className="text-sm text-gray-600 mt-1">
          You were invited as <strong>{invite?.email}</strong> ({invite?.role}).
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
          <input
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="0911234567"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Create password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Accept & continue to login'}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p className="text-center mt-16 text-sm text-gray-500">Loading…</p>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
