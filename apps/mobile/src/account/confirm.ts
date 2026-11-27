import { Alert, Platform } from 'react-native';

/** Yes/no question that also works on the web demo (react-native-web's Alert shows nothing). */
export function confirm(title: string, body: string, ok: string, cancel: string, onOk: () => void, destructive = true) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${body}`)) onOk(); return; }
  Alert.alert(title, body, [{ text: cancel, style: 'cancel' }, { text: ok, style: destructive ? 'destructive' : 'default', onPress: onOk }]);
}

/** One-button notice that also works on the web (failed save, refused deletion…). */
export function notify(title: string, body: string) {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${body}`); return; }
  Alert.alert(title, body);
}
