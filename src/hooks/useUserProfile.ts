import { useEffect, useState, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
  if (!_client) _client = generateClient<Schema>();
  return _client;
}

export function useUserProfile(userId: string | null) {
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client.models.UserProfile as any).list()
      .then((res: { data?: Array<{ id: string; preferredLanguage?: string | null }> }) => {
        const profile = res.data?.[0] ?? null;
        if (profile) {
          setProfileId(profile.id);
          setPreferredLanguage(profile.preferredLanguage ?? null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const setLanguage = useCallback(async (lang: string) => {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models = client.models as any;
    if (profileId) {
      await models.UserProfile.update({ id: profileId, preferredLanguage: lang });
    } else {
      const res = await models.UserProfile.create({ preferredLanguage: lang });
      setProfileId(res.data?.id ?? null);
    }
    setPreferredLanguage(lang);
  }, [profileId]);

  return { preferredLanguage, setLanguage, loading };
}
