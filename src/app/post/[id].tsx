import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SharedNewsRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id || typeof id !== 'string') return <Redirect href="/" />;
  return <Redirect href={{ pathname: '/', params: { newsId: id } }} />;
}
