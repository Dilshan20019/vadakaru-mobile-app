import { Alert } from 'react-native';
import api, { errMsg } from '../api/client';

// Bookmark / un-bookmark a worker; calls onChange(worker) with the updated flag
export default function useWorkerActions(onChange) {
  const toggleSave = async (w) => {
    try {
      if (w.saved) await api.delete(`/workers/${w._id}/save`);
      else await api.post(`/workers/${w._id}/save`);
      onChange({ ...w, saved: !w.saved });
    } catch (e) {
      Alert.alert('Could not update', errMsg(e));
    }
  };
  return { toggleSave };
}
