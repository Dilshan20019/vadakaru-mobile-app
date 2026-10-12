import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api, { errMsg } from '../api/client';

// Shared apply / save actions used by the job feed, map, saved list and job detail.
export function useJobActions(reload) {
  const router = useRouter();
  // CREATE application, then show the confirmation screen
  const apply = async (job) => {
    try {
      const { data } = await api.post(`/jobs/${job._id}/apply`, {});
      reload && reload();
      router.push({ pathname: '/ApplicationSent', params: { applicationId: data.application._id } });
    } catch (e) {
      Alert.alert('Could not apply', errMsg(e));
    }
  };

  // CREATE / DELETE saved job
  const toggleSave = async (job) => {
    try {
      if (job.saved) await api.delete(`/jobs/${job._id}/save`);
      else await api.post(`/jobs/${job._id}/save`);
      reload && reload();
    } catch (e) {
      Alert.alert('Could not update saved jobs', errMsg(e));
    }
  };

  return { apply, toggleSave };
}
