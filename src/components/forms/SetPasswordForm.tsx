import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { z } from 'zod';

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be 128 characters or fewer'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

interface Props {
  copy: {
    heading: string;
    body: string;
    passwordLabel: string;
    confirmLabel: string;
    matchLabel: string;
    mismatchLabel: string;
    submitLabel: string;
  };
}

const inputClasses =
  'h-[52px] w-full rounded-xl border border-slate-400/40 bg-white px-4 pr-12 text-base text-ink-800 shadow-soft transition-colors duration-200 hover:border-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-[3px] focus:ring-cyan-400/30';

export default function SetPasswordForm({ copy }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const matchState = useMemo(() => {
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? 'match' : 'mismatch';
  }, [password, confirmPassword]);

  // TODO(auth): this handler simulates a successful round trip — no request
  // is ever sent. When the backend exists, replace the body of onSubmit
  // with something like:
  //
  //   const onSubmit = async ({ password }: SetPasswordValues) => {
  //     setStatus('submitting');
  //     setServerError(null); // new state — see below
  //     try {
  //       const res = await fetch('/api/auth/reset-password', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ token, password }), // `token` = new prop,
  //                                                     // read from the URL
  //                                                     // in set-password.astro
  //                                                     // — see its TODO.
  //       });
  //       if (!res.ok) {
  //         const { error } = await res.json().catch(() => ({ error: 'unknown' }));
  //         // TODO(auth): map backend error codes to user-facing copy, e.g.
  //         //   'token_expired'  -> "This link has expired — request a new one."
  //         //   'token_invalid'  -> "This link is invalid — request a new one."
  //         //   'weak_password'  -> surface as a field error on `password`,
  //         //                       not a generic banner (mirror `errors.password`
  //         //                       below), since the backend may enforce
  //         //                       stronger rules than the client-side zod
  //         //                       schema above (e.g. breached-password checks).
  //         setServerError(error);
  //         setStatus('idle');
  //         return;
  //       }
  //       // TODO(auth): decide whether a successful reset auto-signs the user
  //       // in (backend returns a session, this component would need to
  //       // store/forward it) or just shows the "success — go sign in"
  //       // state already built below. Either is a reasonable product
  //       // choice; just make it deliberately.
  //       setStatus('success');
  //     } catch {
  //       setServerError('network_error');
  //       setStatus('idle');
  //     }
  //   };
  //
  // Password validation TODO: the zod schema above (min 8 / max 128 chars)
  // is a reasonable client-side baseline but the backend MUST re-validate
  // independently — never trust client-side validation alone for a security
  // boundary. If WordPress enforces different/stronger password rules
  // (length, complexity, breached-password checks via an API like HIBP),
  // surface those as field-level errors the same way `errors.password` is
  // rendered below, not as a silent rejection.
  const onSubmit = async (_values: SetPasswordValues) => {
    // The account backend is not part of this build; simulate the round trip
    // so the UI flow (loading -> success) is complete and testable.
    setStatus('submitting');
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex flex-col items-center gap-4 py-16 text-center"
        role="status"
      >
        <CheckCircle2 size={56} className="text-cyan-500" aria-hidden="true" />
        <p className="text-ink-600 text-lg">Your password has been set. You can now sign in.</p>
        <a
          href="/sign-in"
          className="font-heading text-sm font-semibold tracking-wide text-cyan-600 uppercase underline-offset-4 hover:underline"
        >
          Go to sign in
        </a>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label
          htmlFor="set-password"
          className="font-heading text-navy-950 mb-2 block text-sm font-bold tracking-wide uppercase"
        >
          {copy.passwordLabel}
        </label>
        <div className="relative">
          <input
            id="set-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'set-password-error' : undefined}
            className={inputClasses}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="hover:text-navy-950 absolute top-1/2 right-4 -translate-y-1/2 text-slate-500 transition-colors"
          >
            {showPassword ? (
              <EyeOff size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="set-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="mt-6">
        <label
          htmlFor="confirm-password"
          className="font-heading text-navy-950 mb-2 block text-sm font-bold tracking-wide uppercase"
        >
          {copy.confirmLabel}
        </label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={matchState === 'mismatch' ? true : undefined}
            className={inputClasses}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            aria-pressed={showConfirm}
            className="hover:text-navy-950 absolute top-1/2 right-4 -translate-y-1/2 text-slate-500 transition-colors"
          >
            {showConfirm ? (
              <EyeOff size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-2 min-h-5 text-right text-sm" role="status" aria-live="polite">
          {matchState === 'match' && <span className="text-navy-700">{copy.matchLabel}</span>}
          {matchState === 'mismatch' && <span className="text-red-600">{copy.mismatchLabel}</span>}
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="font-heading text-navy-950 shadow-soft hover:shadow-card inline-flex h-[52px] w-full max-w-[500px] items-center justify-center gap-2 rounded-xl bg-cyan-400 text-sm font-semibold tracking-wide uppercase transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-cyan-300 focus-visible:ring-[3px] focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
        >
          {status === 'submitting' && (
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          )}
          {status === 'submitting' ? 'Saving…' : copy.submitLabel}
        </button>
      </div>
    </form>
  );
}
