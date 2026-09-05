import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { NAV_ITEMS } from '../navConfig';

// First-login guided tour: walks the nav sections already visible to this user's role
// (same NAV_ITEMS/roles config the nav bar itself uses) so there's no separate
// "what can this role see" logic to maintain.
export default function OnboardingTour() {
  const { user, role } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    client.get('/users/me')
      .then(({ data }) => {
        if (!data.onboarding_seen_at) setVisible(true);
      })
      .catch(() => {});
  }, [user]);

  const dismiss = async () => {
    setDismissing(true);
    try {
      await client.patch('/users/me/onboarding-seen');
    } catch {
      // non-critical — worst case the tour reappears next login
    } finally {
      setVisible(false);
      setDismissing(false);
    }
  };

  if (!visible) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-card border border-border rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-start justify-between gap-4 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Welcome to PeoplePay360</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Here's what's available to you as a <strong>{role?.replace(/_/g, ' ')}</strong>.
                </p>
              </div>
            </div>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-muted shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.path} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition">
                  <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-border flex justify-end">
            <button
              onClick={dismiss}
              disabled={dismissing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition"
            >
              {dismissing ? 'Closing...' : <>Got it <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
