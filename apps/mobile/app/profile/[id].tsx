import { useLocalSearchParams } from 'expo-router';
import { DEMO_PICKS } from '../../src/demo/profiles';
import { EmptyState, Screen } from '../../src/ui';
import { ProfileCard } from '../../src/ui/ProfileCard';

export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rec = DEMO_PICKS.find((r) => r.profile.id === id);
  return <Screen>{rec ? <ProfileCard rec={rec} onReact={() => {}} /> : <EmptyState title="Profil introuvable" />}</Screen>;
}
